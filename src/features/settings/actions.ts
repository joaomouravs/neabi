"use server";

import { revalidatePath } from "next/cache";

import { Shift } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";
import { audit, logger } from "@/server/logger";
import {
  actionError,
  actionOk,
  ConflictError,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { emailStatus, sendTestEmail } from "@/server/notifications";
import { enforceRateLimit } from "@/server/rate-limit";
import { getSettings, upsertSettings } from "@/server/repositories/settings-repository";
import { settingsSchema } from "@/validators/settings";

/**
 * Configurações institucionais.
 *
 * Restritas a ADMIN: alteram prazos, dias de atendimento e turnos, ou seja,
 * mudam as regras que o serviço de reservas aplica a todo mundo.
 */
export async function updateSettingsAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("settings:manage");

    const parsed = settingsSchema.safeParse({
      libraryName: formData.get("libraryName"),
      institution: formData.get("institution"),
      campus: formData.get("campus"),
      email: formData.get("email") ?? "",
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      serviceDays: formData.getAll("serviceDays").map(String),
      availableShifts: formData.getAll("availableShifts").map(String),
      openingHours: {},
      reservationLeadDays: formData.get("reservationLeadDays"),
      reservationHorizonDays: formData.get("reservationHorizonDays"),
      pickupDeadlineDays: formData.get("pickupDeadlineDays"),
      maxActiveReservations: formData.get("maxActiveReservations"),
      reservationInstructions: formData.get("reservationInstructions") ?? "",
      socialLinks: {
        instagram: formData.get("instagram") ?? "",
        facebook: formData.get("facebook") ?? "",
        youtube: formData.get("youtube") ?? "",
        x: formData.get("x") ?? "",
        site: formData.get("site") ?? "",
      },
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const socialLinks = Object.fromEntries(
      Object.entries(parsed.data.socialLinks).filter(
        ([, value]) => typeof value === "string" && value.length > 0,
      ),
    );

    await upsertSettings({
      libraryName: parsed.data.libraryName,
      institution: parsed.data.institution,
      campus: parsed.data.campus,
      email: parsed.data.email ?? "",
      phone: parsed.data.phone ?? "",
      address: parsed.data.address ?? "",
      serviceDays: parsed.data.serviceDays,
      availableShifts: parsed.data.availableShifts as Shift[],
      reservationLeadDays: parsed.data.reservationLeadDays,
      reservationHorizonDays: parsed.data.reservationHorizonDays,
      pickupDeadlineDays: parsed.data.pickupDeadlineDays,
      maxActiveReservations: parsed.data.maxActiveReservations,
      reservationInstructions: parsed.data.reservationInstructions,
      socialLinks,
    });

    // As configurações aparecem no rodapé de todas as páginas.
    // As configurações mudam as regras que valem para todo mundo (dias de
    // atendimento, prazos, limite de reservas): a mudança precisa ser rastreável.
    audit("configuracoes.atualizadas", { actorId: actor.id });

    revalidatePath("/", "layout");
    revalidatePath("/admin/configuracoes");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * E-mail de teste para a própria conta de quem pede.
 *
 * O destinatário nunca vem do formulário: um campo livre transformaria o
 * painel num canal de envio para qualquer endereço. Quando o provedor recusa,
 * a mensagem dele volta para a tela — é a informação que a equipe precisa
 * para corrigir a configuração.
 */
export async function sendTestEmailAction(): Promise<ActionResult<{ to: string }>> {
  try {
    const actor = await requirePermission("settings:manage");

    if (!emailStatus().enabled) {
      throw new ConflictError(
        'O envio de e-mail está desligado (MAIL_DRIVER="console"). Nada sairia.',
      );
    }

    enforceRateLimit({
      action: "email-teste",
      subject: actor.id,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    const [user, settings] = await Promise.all([
      prisma.user.findUnique({ where: { id: actor.id }, select: { email: true } }),
      getSettings(),
    ]);
    if (!user?.email) throw new ValidationError("Sua conta não tem e-mail cadastrado.");

    try {
      await sendTestEmail(user.email, settings.libraryName);
    } catch (error) {
      logger.warn("E-mail de teste recusado pelo provedor", { error });
      const detalhe = error instanceof Error ? error.message : String(error);
      throw new ConflictError(`O provedor recusou o envio: ${detalhe}`);
    }

    audit("configuracoes.email_teste", { actorId: actor.id });
    return actionOk({ to: user.email });
  } catch (error) {
    return actionError(error);
  }
}
