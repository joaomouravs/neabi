import { customAlphabet } from "nanoid";

import {
  BookStatus,
  CopyStatus,
  Prisma,
  ReservationStatus,
} from "@/generated/prisma/client";
import { parseISODate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/errors";
import { notifyReservationEvent } from "@/server/notifications";
import { getSettings } from "@/server/repositories/settings-repository";
import { can, type Actor } from "@/server/permissions/rbac";
import type { ReservationAction, ReservationFormValues } from "@/validators/reservation";

import {
  ACTIVE_STATUSES,
  canTransition,
  OCCUPYING_STATUSES,
  pickupDeadlineFrom,
  SCHEDULE_MESSAGES,
  statusForAction,
  validateSchedule,
} from "./reservation-rules";

/**
 * Serviço de reservas presenciais.
 *
 * Todas as decisões acontecem aqui, no servidor. Nada vindo do cliente é
 * aceito como verdade: o livro é resolvido pelo slug da rota, o usuário vem da
 * sessão, o exemplar é escolhido (ou validado) pelo servidor e a disponibilidade
 * é recalculada dentro da transação que a consome.
 */

type Tx = Prisma.TransactionClient;

/** Alfabeto sem caracteres ambíguos — protocolos são lidos em voz alta. */
const protocolSuffix = customAlphabet("ACDEFGHJKLMNPQRSTUVWXYZ2345679", 6);

function buildProtocol(now: Date = new Date()): string {
  return `NEABI-${now.getUTCFullYear()}-${protocolSuffix()}`;
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export interface CreateReservationResult {
  id: string;
  protocol: string;
  bookTitle: string;
  bookSlug: string;
  requestedDate: Date;
  shift: ReservationFormValues["shift"];
  status: ReservationStatus;
  location: string;
}

export async function createReservation(
  actor: Actor,
  bookSlug: string,
  form: ReservationFormValues,
): Promise<CreateReservationResult> {
  if (!can(actor, "reservation:create")) throw new ForbiddenError();

  const settings = await getSettings();

  // 1. Data e turno precisam caber nas regras institucionais vigentes.
  const requestedDate = parseISODate(form.requestedDate);
  if (!requestedDate) {
    throw new ValidationError("Selecione uma data válida.", "requestedDate");
  }

  const violation = validateSchedule(requestedDate, form.shift, {
    serviceDays: settings.serviceDays,
    availableShifts: settings.availableShifts,
    reservationLeadDays: settings.reservationLeadDays,
    reservationHorizonDays: settings.reservationHorizonDays,
  });
  if (violation) {
    throw new ValidationError(
      SCHEDULE_MESSAGES[violation],
      violation === "SHIFT_UNAVAILABLE" ? "shift" : "requestedDate",
    );
  }

  // 2. A obra precisa estar publicada e ter exemplar físico livre.
  const book = await prisma.book.findFirst({
    where: { slug: bookSlug, status: BookStatus.PUBLISHED },
    select: { id: true, title: true, slug: true },
  });
  if (!book) throw new NotFoundError("Obra não encontrada no acervo.");

  // 3. Limites por usuário.
  const [activeCount, sameBookActive] = await Promise.all([
    prisma.reservation.count({
      where: { userId: actor.id, status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.reservation.count({
      where: {
        userId: actor.id,
        bookId: book.id,
        status: { in: [...ACTIVE_STATUSES] },
      },
    }),
  ]);

  if (sameBookActive > 0) {
    throw new ConflictError(
      "Você já possui uma solicitação em andamento para esta obra.",
    );
  }

  if (activeCount >= settings.maxActiveReservations) {
    throw new ConflictError(
      `Você atingiu o limite de ${settings.maxActiveReservations} reservas ativas. Conclua ou cancele uma reserva antes de solicitar outra.`,
    );
  }

  const location = [settings.institution, settings.campus, settings.address]
    .filter((part) => part && part.length > 0)
    .join(" — ");

  // 4. Registro. A solicitação nasce PENDING: ela ainda não reserva exemplar,
  //    porque só a aprovação da equipe compromete o acervo. Ainda assim
  //    exigimos que exista exemplar livre no momento do pedido.
  const reservation = await prisma.$transaction(async (tx) => {
    const availableCopies = await tx.physicalCopy.count({
      where: { bookId: book.id, status: CopyStatus.AVAILABLE },
    });
    if (availableCopies === 0) {
      throw new ConflictError(
        "Não há exemplar físico disponível para esta obra no momento.",
      );
    }

    return createWithUniqueProtocol(tx, {
      userId: actor.id,
      bookId: book.id,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      registrationId: form.registrationId,
      patronType: form.patronType,
      requestedDate,
      shift: form.shift,
      purpose: form.purpose,
    });
  });

  await prisma.reservationHistory.create({
    data: {
      reservationId: reservation.id,
      previousStatus: null,
      newStatus: ReservationStatus.PENDING,
      changedById: actor.id,
      note: "Solicitação registrada pelo formulário público.",
    },
  });

  await notifyReservationEvent("reservation_requested", {
    protocol: reservation.protocol,
    recipientName: form.fullName,
    recipientEmail: form.email,
    bookTitle: book.title,
    bookSlug: book.slug,
    requestedDate,
    shift: form.shift,
    libraryName: settings.libraryName,
    campus: settings.campus,
    location,
    instructions: settings.reservationInstructions || null,
  });

  return {
    id: reservation.id,
    protocol: reservation.protocol,
    bookTitle: book.title,
    bookSlug: book.slug,
    requestedDate,
    shift: form.shift,
    status: ReservationStatus.PENDING,
    location,
  };
}

/** Protocolos são aleatórios; colisão é improvável, mas tratada. */
async function createWithUniqueProtocol(
  tx: Tx,
  data: Omit<Prisma.ReservationUncheckedCreateInput, "protocol">,
): Promise<{ id: string; protocol: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await tx.reservation.create({
        data: { ...data, protocol: buildProtocol() },
        select: { id: true, protocol: true },
      });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isUniqueViolation) throw error;
    }
  }
  throw new ConflictError("Não foi possível gerar o protocolo. Tente novamente.");
}

// ---------------------------------------------------------------------------
// Transições
// ---------------------------------------------------------------------------

export interface TransitionInput {
  reservationId: string;
  action: ReservationAction;
  note?: string | null;
  copyId?: string | null;
}

const EVENT_BY_STATUS: Partial<
  Record<ReservationStatus, Parameters<typeof notifyReservationEvent>[0]>
> = {
  APPROVED: "reservation_approved",
  REJECTED: "reservation_rejected",
  READY_FOR_PICKUP: "ready_for_pickup",
  CANCELLED: "reservation_cancelled",
  EXPIRED: "reservation_expired",
};

/**
 * Aplica uma transição de estado.
 *
 * A alocação do exemplar é a parte delicada: dois administradores aprovando
 * pedidos diferentes ao mesmo tempo não podem prometer o mesmo exemplar. Isso
 * é garantido por uma atualização condicional (`updateMany` restrito a
 * `status = AVAILABLE`), que no PostgreSQL é uma comparação e escrita atômica
 * na linha — quem chegar depois recebe zero linhas afetadas e falha.
 */
export async function transitionReservation(
  actor: Actor,
  input: TransitionInput,
): Promise<void> {
  const settings = await getSettings();
  const targetStatus = statusForAction(input.action);

  const outcome = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      select: {
        id: true,
        protocol: true,
        status: true,
        userId: true,
        bookId: true,
        copyId: true,
        fullName: true,
        email: true,
        requestedDate: true,
        shift: true,
        book: { select: { title: true, slug: true } },
      },
    });
    if (!reservation) throw new NotFoundError("Reserva não encontrada.");

    // Autorização: o próprio solicitante só pode cancelar; o restante exige
    // permissão de gestão de reservas.
    const isOwner = reservation.userId === actor.id;
    const managesReservations = can(actor, "reservation:manage");
    if (input.action === "cancel") {
      if (!isOwner && !managesReservations) throw new ForbiddenError();
    } else if (!managesReservations) {
      throw new ForbiddenError();
    }

    if (!canTransition(reservation.status, targetStatus)) {
      throw new ConflictError(
        "Esta ação não é possível a partir do estado atual da reserva.",
      );
    }

    let copyId = reservation.copyId;

    // Aprovação compromete um exemplar.
    if (targetStatus === ReservationStatus.APPROVED) {
      copyId = await allocateCopy(tx, reservation.bookId, input.copyId ?? null);
    }

    // Estados que devolvem o exemplar ao acervo.
    const releasesCopy =
      targetStatus === ReservationStatus.REJECTED ||
      targetStatus === ReservationStatus.CANCELLED ||
      targetStatus === ReservationStatus.EXPIRED ||
      targetStatus === ReservationStatus.RETURNED;

    if (releasesCopy && copyId) {
      await tx.physicalCopy.updateMany({
        where: { id: copyId, status: { in: [CopyStatus.RESERVED, CopyStatus.IN_USE] } },
        data: { status: CopyStatus.AVAILABLE },
      });
    }

    if (targetStatus === ReservationStatus.PICKED_UP) {
      if (!copyId) {
        throw new ValidationError(
          "A reserva não possui exemplar designado. Aprove-a antes de registrar a retirada.",
        );
      }
      await tx.physicalCopy.update({
        where: { id: copyId },
        data: { status: CopyStatus.IN_USE },
      });
    }

    const now = new Date();
    const pickupDeadline =
      targetStatus === ReservationStatus.READY_FOR_PICKUP
        ? pickupDeadlineFrom(now, settings.pickupDeadlineDays)
        : undefined;

    await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status: targetStatus,
        copyId,
        adminNote: input.note ?? undefined,
        ...(targetStatus === ReservationStatus.APPROVED
          ? { approvedById: actor.id, approvedAt: now }
          : {}),
        ...(targetStatus === ReservationStatus.READY_FOR_PICKUP
          ? { readyAt: now, pickupDeadline }
          : {}),
        ...(targetStatus === ReservationStatus.PICKED_UP
          ? { pickedUpAt: now }
          : {}),
        ...(targetStatus === ReservationStatus.RETURNED
          ? { returnedAt: now }
          : {}),
        ...(targetStatus === ReservationStatus.CANCELLED
          ? { cancelledAt: now }
          : {}),
      },
    });

    await tx.reservationHistory.create({
      data: {
        reservationId: reservation.id,
        previousStatus: reservation.status,
        newStatus: targetStatus,
        changedById: actor.id,
        note: input.note ?? null,
      },
    });

    return { reservation, pickupDeadline: pickupDeadline ?? null };
  });

  const event = EVENT_BY_STATUS[targetStatus];
  if (event) {
    const location = [settings.institution, settings.campus, settings.address]
      .filter((part) => part && part.length > 0)
      .join(" — ");

    await notifyReservationEvent(event, {
      protocol: outcome.reservation.protocol,
      recipientName: outcome.reservation.fullName,
      recipientEmail: outcome.reservation.email,
      bookTitle: outcome.reservation.book.title,
      bookSlug: outcome.reservation.book.slug,
      requestedDate: outcome.reservation.requestedDate,
      shift: outcome.reservation.shift,
      libraryName: settings.libraryName,
      campus: settings.campus,
      location,
      note: input.note ?? null,
      pickupDeadline: outcome.pickupDeadline,
      instructions: settings.reservationInstructions || null,
    });
  }
}

/**
 * Designa um exemplar à reserva.
 *
 * Quando o administrador escolhe um exemplar, validamos que ele pertence à obra
 * e ainda está livre. Quando não escolhe, pegamos o primeiro disponível. Em
 * ambos os casos a tomada é condicional: se outra transação chegou antes, a
 * operação falha em vez de prometer o mesmo exemplar duas vezes.
 */
async function allocateCopy(
  tx: Tx,
  bookId: string,
  requestedCopyId: string | null,
): Promise<string> {
  const candidates = requestedCopyId
    ? await tx.physicalCopy.findMany({
        where: { id: requestedCopyId },
        select: { id: true, bookId: true, status: true },
      })
    : await tx.physicalCopy.findMany({
        where: { bookId, status: CopyStatus.AVAILABLE },
        select: { id: true, bookId: true, status: true },
        orderBy: { code: "asc" },
      });

  if (requestedCopyId) {
    const copy = candidates[0];
    if (!copy) throw new NotFoundError("Exemplar não encontrado.");
    if (copy.bookId !== bookId) {
      throw new ValidationError(
        "O exemplar selecionado não pertence a esta obra.",
        "copyId",
      );
    }
  }

  for (const candidate of candidates) {
    const claimed = await tx.physicalCopy.updateMany({
      where: { id: candidate.id, status: CopyStatus.AVAILABLE },
      data: { status: CopyStatus.RESERVED },
    });

    if (claimed.count === 1) {
      // Cinto e suspensório: nenhuma outra reserva ativa pode apontar para
      // este exemplar.
      const conflicting = await tx.reservation.count({
        where: {
          copyId: candidate.id,
          status: { in: [...OCCUPYING_STATUSES] },
        },
      });
      if (conflicting > 0) {
        await tx.physicalCopy.update({
          where: { id: candidate.id },
          data: { status: CopyStatus.AVAILABLE },
        });
        continue;
      }
      return candidate.id;
    }
  }

  throw new ConflictError(
    "Não há exemplar disponível para aprovar esta reserva no momento.",
  );
}

// ---------------------------------------------------------------------------
// Manutenção
// ---------------------------------------------------------------------------

/**
 * Expira reservas cujo prazo de retirada venceu e devolve os exemplares.
 * Pensada para ser chamada por uma tarefa agendada.
 */
export async function expireOverdueReservations(
  now: Date = new Date(),
): Promise<number> {
  const overdue = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.READY_FOR_PICKUP,
      pickupDeadline: { lt: now },
    },
    select: { id: true, copyId: true },
  });

  for (const reservation of overdue) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.EXPIRED },
      });
      if (reservation.copyId) {
        await tx.physicalCopy.updateMany({
          where: {
            id: reservation.copyId,
            status: { in: [CopyStatus.RESERVED, CopyStatus.IN_USE] },
          },
          data: { status: CopyStatus.AVAILABLE },
        });
      }
      await tx.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          previousStatus: ReservationStatus.READY_FOR_PICKUP,
          newStatus: ReservationStatus.EXPIRED,
          note: "Prazo de retirada vencido.",
        },
      });
    });
  }

  return overdue.length;
}
