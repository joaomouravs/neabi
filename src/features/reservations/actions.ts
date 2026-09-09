"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActor, requirePermission } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type ActionResult,
  type AppErrorCode,
} from "@/server/errors";
import { canCancelReservation } from "@/server/permissions/rbac";
import { findReservationById } from "@/server/repositories/reservation-repository";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  createReservation,
  transitionReservation,
} from "@/server/services/reservation-service";
import {
  cancelOwnReservationSchema,
  reservationActionSchema,
  reservationFormSchema,
} from "@/validators/reservation";

/**
 * Ações de reserva.
 *
 * Nada de identificador vindo do cliente é aceito como autoridade: o usuário
 * vem da sessão, a obra vem do slug da rota e o exemplar é escolhido pelo
 * serviço. Toda a regra fica em `server/services/reservation-service.ts`.
 */

/**
 * Valores devolvidos ao formulário quando a solicitação falha.
 *
 * O React reinicia um `<form action>` depois que a ação termina, o que apagaria
 * tudo que a pessoa digitou justamente no momento em que ela precisa corrigir
 * um campo. Devolvemos o que foi enviado para repovoar o formulário.
 */
export interface ReservationEcho {
  fullName: string;
  email: string;
  phone: string;
  registrationId: string;
  patronType: string;
  requestedDate: string;
  shift: string;
  purpose: string;
  acknowledgement: boolean;
}

export type ReservationFormState =
  | { ok: true; data: { protocol: string; slug: string } }
  | {
      ok: false;
      error: string;
      code: AppErrorCode;
      field?: string;
      values: ReservationEcho;
    };

function echoOf(formData: FormData): ReservationEcho {
  const text = (key: string) => String(formData.get(key) ?? "");
  return {
    fullName: text("fullName"),
    email: text("email"),
    phone: text("phone"),
    registrationId: text("registrationId"),
    patronType: text("patronType"),
    requestedDate: text("requestedDate"),
    shift: text("shift"),
    purpose: text("purpose"),
    acknowledgement: formData.get("acknowledgement") === "on",
  };
}

/**
 * Registra a solicitação.
 *
 * No sucesso, o redirecionamento acontece no servidor: é a única forma de não
 * depender de um efeito no cliente que corre contra a reinicialização do
 * formulário feita pelo React.
 */
export async function createReservationAction(
  _previous: unknown,
  formData: FormData,
): Promise<ReservationFormState> {
  let destination: string | null = null;

  try {
    const actor = await requireActor();

    const bookSlug = String(formData.get("bookSlug") ?? "");
    if (!bookSlug) throw new ValidationError("Obra não informada.");

    // Proteção contra automação. O limite real de uso é institucional e vive
    // em `Settings.maxActiveReservations`; este teto é apenas anti-abuso e por
    // isso fica bem acima do que alguém pesquisando o acervo alcançaria.
    enforceRateLimit({
      action: "create-reservation",
      subject: actor.id,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = reservationFormSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      registrationId: formData.get("registrationId") ?? "",
      patronType: formData.get("patronType"),
      requestedDate: formData.get("requestedDate"),
      shift: formData.get("shift"),
      purpose: formData.get("purpose") ?? "",
      acknowledgement: formData.get("acknowledgement") === "on",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const reservation = await createReservation(actor, bookSlug, parsed.data);

    revalidatePath(`/acervo/${bookSlug}`);
    revalidatePath("/minha-conta/reservas");

    destination = `/acervo/${bookSlug}/reservar/confirmacao?protocolo=${encodeURIComponent(reservation.protocol)}`;
  } catch (error) {
    const failure = actionError(error);
    return { ...failure, values: echoOf(formData) } as ReservationFormState;
  }

  // `redirect` lança um sinal de controle: precisa ficar fora do try/catch para
  // não ser confundido com uma falha da operação.
  redirect(destination);
}

/** Cancelamento pelo próprio solicitante. */
export async function cancelReservationAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requireActor();

    const parsed = cancelOwnReservationSchema.safeParse({
      reservationId: formData.get("reservationId"),
      reason: formData.get("reason") ?? "",
    });
    if (!parsed.success) {
      throw new ValidationError("Não foi possível identificar a reserva.");
    }

    const reservation = await findReservationById(parsed.data.reservationId);
    if (!reservation) throw new NotFoundError("Reserva não encontrada.");
    if (!canCancelReservation(actor, reservation)) throw new ForbiddenError();

    await transitionReservation(actor, {
      reservationId: reservation.id,
      action: "cancel",
      note: parsed.data.reason ?? "Cancelada pela pessoa solicitante.",
    });

    revalidatePath("/minha-conta/reservas");
    revalidatePath(`/minha-conta/reservas/${reservation.id}`);
    revalidatePath(`/acervo/${reservation.book.slug}`);

    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/** Transições administrativas: aprovar, recusar, separar, retirar, devolver. */
export async function manageReservationAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("reservation:manage");

    const parsed = reservationActionSchema.safeParse({
      reservationId: formData.get("reservationId"),
      action: formData.get("action"),
      note: formData.get("note") ?? "",
      copyId: formData.get("copyId") ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    await transitionReservation(actor, {
      reservationId: parsed.data.reservationId,
      action: parsed.data.action,
      note: parsed.data.note,
      copyId: parsed.data.copyId || null,
    });

    revalidatePath("/admin/reservas");
    revalidatePath(`/admin/reservas/${parsed.data.reservationId}`);
    revalidatePath("/admin");
    revalidatePath("/minha-conta/reservas");

    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}
