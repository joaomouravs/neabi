import { describe, expect, it } from "vitest";

import { ReservationStatus, Shift } from "@/generated/prisma/enums";
import { parseISODate } from "@/lib/date";
import {
  ACTIVE_STATUSES,
  availableActions,
  canTransition,
  firstAvailableDate,
  isExpired,
  occupiesCopy,
  pickupDeadlineFrom,
  scheduleBounds,
  statusForAction,
  validateSchedule,
} from "@/server/services/reservation-rules";

/**
 * Regras de reserva.
 *
 * Estas são as decisões que protegem o acervo: o que pode virar o quê, quando
 * uma data é aceitável e quando um exemplar está comprometido. Por isso são as
 * funções mais testadas do sistema.
 */

// Quinta-feira, 10 de setembro de 2026, meio-dia no fuso da biblioteca.
const NOW = new Date("2026-09-10T15:00:00.000Z");

const RULES = {
  serviceDays: [1, 2, 3, 4, 5],
  availableShifts: [Shift.MORNING, Shift.AFTERNOON],
  reservationLeadDays: 1,
  reservationHorizonDays: 60,
};

describe("máquina de estados da reserva", () => {
  it("segue o fluxo padrão até a devolução", () => {
    expect(canTransition(ReservationStatus.PENDING, ReservationStatus.APPROVED)).toBe(true);
    expect(
      canTransition(ReservationStatus.APPROVED, ReservationStatus.READY_FOR_PICKUP),
    ).toBe(true);
    expect(
      canTransition(ReservationStatus.READY_FOR_PICKUP, ReservationStatus.PICKED_UP),
    ).toBe(true);
    expect(canTransition(ReservationStatus.PICKED_UP, ReservationStatus.RETURNED)).toBe(
      true,
    );
  });

  it("não permite pular da solicitação direto para a retirada", () => {
    expect(canTransition(ReservationStatus.PENDING, ReservationStatus.PICKED_UP)).toBe(
      false,
    );
    expect(canTransition(ReservationStatus.PENDING, ReservationStatus.RETURNED)).toBe(
      false,
    );
  });

  it("trata estados finais como definitivos", () => {
    for (const terminal of [
      ReservationStatus.REJECTED,
      ReservationStatus.RETURNED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED,
    ]) {
      expect(availableActions(terminal)).toHaveLength(0);
    }
  });

  it("não reabre uma reserva devolvida", () => {
    expect(canTransition(ReservationStatus.RETURNED, ReservationStatus.PENDING)).toBe(
      false,
    );
    expect(canTransition(ReservationStatus.RETURNED, ReservationStatus.APPROVED)).toBe(
      false,
    );
  });

  it("mapeia cada ação administrativa para um estado", () => {
    expect(statusForAction("approve")).toBe(ReservationStatus.APPROVED);
    expect(statusForAction("reject")).toBe(ReservationStatus.REJECTED);
    expect(statusForAction("ready")).toBe(ReservationStatus.READY_FOR_PICKUP);
    expect(statusForAction("pickup")).toBe(ReservationStatus.PICKED_UP);
    expect(statusForAction("return")).toBe(ReservationStatus.RETURNED);
    expect(statusForAction("cancel")).toBe(ReservationStatus.CANCELLED);
    expect(statusForAction("expire")).toBe(ReservationStatus.EXPIRED);
  });

  it("oferece apenas ações válidas para o estado atual", () => {
    expect(availableActions(ReservationStatus.PENDING).sort()).toEqual(
      ["approve", "cancel", "expire", "reject"].sort(),
    );
    expect(availableActions(ReservationStatus.PICKED_UP)).toEqual(["return"]);
  });
});

describe("ocupação do exemplar", () => {
  it("compromete o exemplar apenas a partir da aprovação", () => {
    expect(occupiesCopy(ReservationStatus.PENDING)).toBe(false);
    expect(occupiesCopy(ReservationStatus.APPROVED)).toBe(true);
    expect(occupiesCopy(ReservationStatus.READY_FOR_PICKUP)).toBe(true);
    expect(occupiesCopy(ReservationStatus.PICKED_UP)).toBe(true);
  });

  it("libera o exemplar nos estados finais", () => {
    expect(occupiesCopy(ReservationStatus.RETURNED)).toBe(false);
    expect(occupiesCopy(ReservationStatus.CANCELLED)).toBe(false);
    expect(occupiesCopy(ReservationStatus.EXPIRED)).toBe(false);
    expect(occupiesCopy(ReservationStatus.REJECTED)).toBe(false);
  });

  it("conta a solicitação pendente no limite de reservas ativas", () => {
    expect(ACTIVE_STATUSES).toContain(ReservationStatus.PENDING);
  });
});

describe("validação de data e turno", () => {
  it("aceita um dia útil dentro da janela", () => {
    // Sexta-feira, 11/09/2026.
    const date = parseISODate("2026-09-11")!;
    expect(validateSchedule(date, Shift.MORNING, RULES, NOW)).toBeNull();
  });

  it("recusa data no passado", () => {
    const date = parseISODate("2026-09-01")!;
    expect(validateSchedule(date, Shift.MORNING, RULES, NOW)).toBe("PAST_DATE");
  });

  it("recusa data que não respeita a antecedência mínima", () => {
    // Hoje, com antecedência mínima de 1 dia.
    const date = parseISODate("2026-09-10")!;
    expect(validateSchedule(date, Shift.MORNING, RULES, NOW)).toBe("TOO_SOON");
  });

  it("aceita o próprio dia quando não há antecedência exigida", () => {
    const date = parseISODate("2026-09-10")!;
    expect(
      validateSchedule(date, Shift.MORNING, { ...RULES, reservationLeadDays: 0 }, NOW),
    ).toBeNull();
  });

  it("recusa data além da janela de agendamento", () => {
    const date = parseISODate("2027-01-15")!;
    expect(validateSchedule(date, Shift.MORNING, RULES, NOW)).toBe("TOO_FAR");
  });

  it("recusa dia sem atendimento", () => {
    // Domingo, 13/09/2026.
    const date = parseISODate("2026-09-13")!;
    expect(validateSchedule(date, Shift.MORNING, RULES, NOW)).toBe("CLOSED_DAY");
  });

  it("recusa turno não habilitado", () => {
    const date = parseISODate("2026-09-11")!;
    expect(validateSchedule(date, Shift.EVENING, RULES, NOW)).toBe(
      "SHIFT_UNAVAILABLE",
    );
  });
});

describe("sugestão de data", () => {
  it("sugere o próximo dia de atendimento", () => {
    const suggestion = firstAvailableDate(RULES, NOW);
    // Quinta 10/09 + 1 dia de antecedência = sexta 11/09, dia útil.
    expect(suggestion?.toISOString().slice(0, 10)).toBe("2026-09-11");
  });

  it("pula o fim de semana", () => {
    // Sexta-feira 11/09/2026: +1 dia cai no sábado, então vai para segunda.
    const friday = new Date("2026-09-11T15:00:00.000Z");
    const suggestion = firstAvailableDate(RULES, friday);
    expect(suggestion?.toISOString().slice(0, 10)).toBe("2026-09-14");
  });

  it("devolve nulo quando nenhum dia da janela tem atendimento", () => {
    const impossible = { ...RULES, serviceDays: [], reservationHorizonDays: 10 };
    expect(firstAvailableDate(impossible, NOW)).toBeNull();
  });

  it("delimita o seletor de data pela antecedência e pela janela", () => {
    const bounds = scheduleBounds(RULES, NOW);
    expect(bounds.min.toISOString().slice(0, 10)).toBe("2026-09-11");
    expect(bounds.max.toISOString().slice(0, 10)).toBe("2026-11-09");
  });
});

describe("prazo de retirada", () => {
  it("conta a partir do momento em que o exemplar fica pronto", () => {
    const readyAt = new Date("2026-09-10T15:00:00.000Z");
    expect(pickupDeadlineFrom(readyAt, 3).toISOString().slice(0, 10)).toBe(
      "2026-09-13",
    );
  });

  it("considera expirada apenas a reserva aguardando retirada com prazo vencido", () => {
    const past = new Date("2026-09-01T00:00:00.000Z");
    expect(
      isExpired(
        { status: ReservationStatus.READY_FOR_PICKUP, pickupDeadline: past },
        NOW,
      ),
    ).toBe(true);

    expect(
      isExpired({ status: ReservationStatus.APPROVED, pickupDeadline: past }, NOW),
    ).toBe(false);

    expect(
      isExpired(
        { status: ReservationStatus.READY_FOR_PICKUP, pickupDeadline: null },
        NOW,
      ),
    ).toBe(false);
  });
});
