import { ReservationStatus, Shift } from "@/generated/prisma/enums";
import {
  addDays,
  differenceInDays,
  todayInLibraryTimeZone,
  weekdayOf,
} from "@/lib/date";
import type { ReservationAction } from "@/validators/reservation";

/**
 * Regras da reserva presencial — funções puras, sem banco.
 *
 * "Reserva" aqui significa **agendamento de consulta/retirada presencial** do
 * exemplar físico, conforme as normas do NEABI. Não pressupõe empréstimo
 * domiciliar: se o NEABI decidir oferecê-lo, as regras entram por aqui sem
 * alterar interface nem repositórios.
 */

/**
 * Estados em que a reserva ainda ocupa o exemplar. Enquanto uma reserva estiver
 * em um destes estados, o mesmo exemplar não pode ser prometido a outra pessoa.
 */
export const OCCUPYING_STATUSES: readonly ReservationStatus[] = [
  ReservationStatus.APPROVED,
  ReservationStatus.READY_FOR_PICKUP,
  ReservationStatus.PICKED_UP,
];

/** Estados que contam para o limite de reservas simultâneas por usuário. */
export const ACTIVE_STATUSES: readonly ReservationStatus[] = [
  ReservationStatus.PENDING,
  ...OCCUPYING_STATUSES,
];

/** Estados finais: nenhuma transição sai deles. */
export const TERMINAL_STATUSES: readonly ReservationStatus[] = [
  ReservationStatus.REJECTED,
  ReservationStatus.RETURNED,
  ReservationStatus.CANCELLED,
  ReservationStatus.EXPIRED,
];

/**
 * Máquina de estados.
 *
 *   PENDING → APPROVED → READY_FOR_PICKUP → PICKED_UP → RETURNED
 *
 * Fluxos alternativos: REJECTED (recusa), CANCELLED (desistência) e EXPIRED
 * (prazo de retirada vencido).
 */
const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDING: [
    ReservationStatus.APPROVED,
    ReservationStatus.REJECTED,
    ReservationStatus.CANCELLED,
    ReservationStatus.EXPIRED,
  ],
  APPROVED: [
    ReservationStatus.READY_FOR_PICKUP,
    ReservationStatus.PICKED_UP,
    ReservationStatus.CANCELLED,
    ReservationStatus.EXPIRED,
  ],
  READY_FOR_PICKUP: [
    ReservationStatus.PICKED_UP,
    ReservationStatus.CANCELLED,
    ReservationStatus.EXPIRED,
  ],
  PICKED_UP: [ReservationStatus.RETURNED],
  REJECTED: [],
  RETURNED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(
  from: ReservationStatus,
): readonly ReservationStatus[] {
  return TRANSITIONS[from];
}

const ACTION_TARGET: Record<ReservationAction, ReservationStatus> = {
  approve: ReservationStatus.APPROVED,
  reject: ReservationStatus.REJECTED,
  ready: ReservationStatus.READY_FOR_PICKUP,
  pickup: ReservationStatus.PICKED_UP,
  return: ReservationStatus.RETURNED,
  cancel: ReservationStatus.CANCELLED,
  expire: ReservationStatus.EXPIRED,
};

export function statusForAction(action: ReservationAction): ReservationStatus {
  return ACTION_TARGET[action];
}

/** Ações que a interface administrativa deve oferecer para o estado atual. */
export function availableActions(
  status: ReservationStatus,
): ReservationAction[] {
  const allowed = TRANSITIONS[status];
  return (Object.keys(ACTION_TARGET) as ReservationAction[]).filter((action) =>
    allowed.includes(ACTION_TARGET[action]),
  );
}

/** O exemplar é liberado nos estados finais e no estado inicial de análise. */
export function occupiesCopy(status: ReservationStatus): boolean {
  return OCCUPYING_STATUSES.includes(status);
}

// ---------------------------------------------------------------------------
// Validação da data desejada
// ---------------------------------------------------------------------------

export interface ScheduleRules {
  serviceDays: readonly number[];
  availableShifts: readonly Shift[];
  reservationLeadDays: number;
  reservationHorizonDays: number;
}

export type ScheduleViolation =
  | "PAST_DATE"
  | "TOO_SOON"
  | "TOO_FAR"
  | "CLOSED_DAY"
  | "SHIFT_UNAVAILABLE";

export const SCHEDULE_MESSAGES: Record<ScheduleViolation, string> = {
  PAST_DATE: "A data escolhida já passou. Selecione uma data futura.",
  TOO_SOON:
    "A data escolhida não respeita a antecedência mínima para atendimento.",
  TOO_FAR: "A data escolhida está além do período aberto para agendamento.",
  CLOSED_DAY: "Não há atendimento presencial na data escolhida.",
  SHIFT_UNAVAILABLE: "O turno escolhido não está disponível para atendimento.",
};

/**
 * Verifica se uma data e um turno cabem nas regras institucionais vigentes.
 * Devolve `null` quando está tudo certo.
 */
export function validateSchedule(
  requestedDate: Date,
  shift: Shift,
  rules: ScheduleRules,
  now: Date = new Date(),
): ScheduleViolation | null {
  const today = todayInLibraryTimeZone(now);
  const offset = differenceInDays(requestedDate, today);

  if (offset < 0) return "PAST_DATE";
  if (offset < rules.reservationLeadDays) return "TOO_SOON";
  if (offset > rules.reservationHorizonDays) return "TOO_FAR";
  if (!rules.serviceDays.includes(weekdayOf(requestedDate))) return "CLOSED_DAY";
  if (!rules.availableShifts.includes(shift)) return "SHIFT_UNAVAILABLE";

  return null;
}

/** Primeira data válida a partir de hoje — usada como padrão do formulário. */
export function firstAvailableDate(
  rules: ScheduleRules,
  now: Date = new Date(),
): Date | null {
  const today = todayInLibraryTimeZone(now);
  for (
    let offset = Math.max(0, rules.reservationLeadDays);
    offset <= rules.reservationHorizonDays;
    offset += 1
  ) {
    const candidate = addDays(today, offset);
    if (rules.serviceDays.includes(weekdayOf(candidate))) return candidate;
  }
  return null;
}

/** Intervalo aceito pelo seletor de data no formulário. */
export function scheduleBounds(
  rules: ScheduleRules,
  now: Date = new Date(),
): { min: Date; max: Date } {
  const today = todayInLibraryTimeZone(now);
  return {
    min: addDays(today, Math.max(0, rules.reservationLeadDays)),
    max: addDays(today, rules.reservationHorizonDays),
  };
}

/** Prazo de retirada, contado a partir do momento em que o exemplar fica pronto. */
export function pickupDeadlineFrom(
  readyAt: Date,
  pickupDeadlineDays: number,
): Date {
  return addDays(readyAt, pickupDeadlineDays);
}

/** Uma reserva aguardando retirada vence quando o prazo passa. */
export function isExpired(
  reservation: { status: ReservationStatus; pickupDeadline: Date | null },
  now: Date = new Date(),
): boolean {
  if (reservation.status !== ReservationStatus.READY_FOR_PICKUP) return false;
  if (!reservation.pickupDeadline) return false;
  return reservation.pickupDeadline.getTime() < now.getTime();
}
