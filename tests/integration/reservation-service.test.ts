import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  CopyStatus,
  PatronType,
  ReservationStatus,
  Role,
  Shift,
} from "@/generated/prisma/enums";
import { addDays, toISODate, todayInLibraryTimeZone } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { setMailTransport } from "@/server/notifications";
import type { Actor } from "@/server/permissions/rbac";
import { SETTINGS_ID } from "@/server/repositories/settings-repository";
import {
  createReservation,
  transitionReservation,
} from "@/server/services/reservation-service";

/**
 * Serviço de reservas contra o banco real.
 *
 * Estes testes cobrem o que nenhum teste puro alcança: transações, alocação
 * atômica de exemplar e a garantia de que dois pedidos concorrentes nunca
 * recebem o mesmo exemplar.
 *
 * Requer o banco de desenvolvimento no ar (`npm run db:dev`). Cada execução
 * cria e remove seus próprios registros, identificados pelo prefixo abaixo.
 */

const PREFIX = "teste-integracao";

let bookId: string;
let requesterOne: Actor;
let requesterTwo: Actor;
let staff: Actor;

/** Uma data de atendimento válida com folga em relação à antecedência mínima. */
function validRequestDate(): string {
  let candidate = addDays(todayInLibraryTimeZone(), 2);
  // Empurra para a próxima segunda-feira se cair no fim de semana.
  while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
    candidate = addDays(candidate, 1);
  }
  return toISODate(candidate);
}

function formFor(name: string) {
  return {
    fullName: name,
    email: `${PREFIX}-${name.toLowerCase()}@exemplo.test`,
    phone: "(21) 90000-0000",
    registrationId: null,
    patronType: PatronType.VISITOR,
    requestedDate: validRequestDate(),
    shift: Shift.MORNING,
    purpose: null,
    acknowledgement: true as const,
  };
}

async function cleanup(): Promise<void> {
  await prisma.reservation.deleteMany({
    where: { book: { slug: { startsWith: PREFIX } } },
  });
  await prisma.physicalCopy.deleteMany({
    where: { book: { slug: { startsWith: PREFIX } } },
  });
  await prisma.book.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
}

beforeAll(async () => {
  // Nenhum e-mail real é disparado durante os testes.
  setMailTransport({ async send() {} });

  await cleanup();

  // Garante regras previsíveis, independentemente do que estiver configurado.
  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      serviceDays: [1, 2, 3, 4, 5],
      availableShifts: [Shift.MORNING, Shift.AFTERNOON],
      reservationLeadDays: 1,
      reservationHorizonDays: 60,
      pickupDeadlineDays: 3,
      maxActiveReservations: 3,
    },
    update: {
      serviceDays: [1, 2, 3, 4, 5],
      availableShifts: [Shift.MORNING, Shift.AFTERNOON],
      reservationLeadDays: 1,
      reservationHorizonDays: 60,
      pickupDeadlineDays: 3,
      maxActiveReservations: 3,
    },
  });

  const book = await prisma.book.create({
    data: {
      slug: `${PREFIX}-obra-unica`,
      title: "Obra de teste com exemplar único",
      status: "PUBLISHED",
      publishedAt: new Date(),
      searchText: "obra de teste com exemplar unico",
      copies: {
        create: { code: `${PREFIX.toUpperCase()}-001`, status: CopyStatus.AVAILABLE },
      },
    },
    select: { id: true },
  });
  bookId = book.id;

  const [one, two, admin] = await Promise.all([
    prisma.user.create({
      data: { email: `${PREFIX}-um@exemplo.test`, name: "Pessoa Um", role: Role.MEMBER },
      select: { id: true, role: true },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-dois@exemplo.test`, name: "Pessoa Dois", role: Role.MEMBER },
      select: { id: true, role: true },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-equipe@exemplo.test`, name: "Equipe", role: Role.ADMIN },
      select: { id: true, role: true },
    }),
  ]);

  requesterOne = one;
  requesterTwo = two;
  staff = admin;
});

afterAll(async () => {
  await cleanup();
  setMailTransport(null);
  await prisma.$disconnect();
});

describe("criação de reserva", () => {
  it("registra a solicitação como pendente, sem comprometer o exemplar", async () => {
    const result = await createReservation(
      requesterOne,
      `${PREFIX}-obra-unica`,
      formFor("Um"),
    );

    expect(result.protocol).toMatch(/^NEABI-\d{4}-[A-Z0-9]{6}$/);
    expect(result.status).toBe(ReservationStatus.PENDING);

    // Só a aprovação compromete o acervo: o exemplar segue disponível.
    const copy = await prisma.physicalCopy.findFirstOrThrow({ where: { bookId } });
    expect(copy.status).toBe(CopyStatus.AVAILABLE);

    // A criação é rastreável desde o primeiro momento.
    const history = await prisma.reservationHistory.findMany({
      where: { reservationId: result.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0].newStatus).toBe(ReservationStatus.PENDING);
  });

  it("impede duas solicitações simultâneas da mesma pessoa para a mesma obra", async () => {
    await expect(
      createReservation(requesterOne, `${PREFIX}-obra-unica`, formFor("Um")),
    ).rejects.toThrow(/já possui uma solicitação em andamento/i);
  });

  it("recusa data em dia sem atendimento", async () => {
    // Encontra o próximo domingo.
    let sunday = addDays(todayInLibraryTimeZone(), 1);
    while (sunday.getUTCDay() !== 0) sunday = addDays(sunday, 1);

    await expect(
      createReservation(requesterTwo, `${PREFIX}-obra-unica`, {
        ...formFor("Dois"),
        requestedDate: toISODate(sunday),
      }),
    ).rejects.toThrow(/atendimento presencial/i);
  });

  it("recusa data no passado", async () => {
    await expect(
      createReservation(requesterTwo, `${PREFIX}-obra-unica`, {
        ...formFor("Dois"),
        requestedDate: toISODate(addDays(todayInLibraryTimeZone(), -3)),
      }),
    ).rejects.toThrow(/já passou/i);
  });

  it("recusa obra inexistente", async () => {
    await expect(
      createReservation(requesterTwo, "obra-que-nao-existe", formFor("Dois")),
    ).rejects.toThrow(/não encontrada/i);
  });

  it("recusa obra sem nenhum exemplar livre", async () => {
    const semExemplar = await prisma.book.create({
      data: {
        slug: `${PREFIX}-obra-sem-exemplar`,
        title: "Obra sem exemplar disponível",
        status: "PUBLISHED",
        publishedAt: new Date(),
        searchText: "obra sem exemplar disponivel",
        copies: {
          create: {
            code: `${PREFIX.toUpperCase()}-MANUT-001`,
            status: CopyStatus.MAINTENANCE,
          },
        },
      },
      select: { slug: true },
    });

    await expect(
      createReservation(requesterTwo, semExemplar.slug, formFor("SemExemplar")),
    ).rejects.toThrow(/não há exemplar físico disponível/i);
  });

  it("recusa obra despublicada, mesmo com exemplar livre", async () => {
    const rascunho = await prisma.book.create({
      data: {
        slug: `${PREFIX}-obra-rascunho`,
        title: "Obra ainda em catalogação",
        status: "DRAFT",
        searchText: "obra ainda em catalogacao",
        copies: {
          create: {
            code: `${PREFIX.toUpperCase()}-DRAFT-001`,
            status: CopyStatus.AVAILABLE,
          },
        },
      },
      select: { slug: true },
    });

    await expect(
      createReservation(requesterTwo, rascunho.slug, formFor("Rascunho")),
    ).rejects.toThrow(/não encontrada/i);
  });

  it("aplica o limite de reservas ativas por pessoa", async () => {
    // Três obras distintas: a regra do limite é por pessoa, não por obra.
    const obras = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        prisma.book.create({
          data: {
            slug: `${PREFIX}-limite-${n}`,
            title: `Obra do limite ${n}`,
            status: "PUBLISHED",
            publishedAt: new Date(),
            searchText: `obra do limite ${n}`,
            copies: {
              create: {
                code: `${PREFIX.toUpperCase()}-LIM-${n}`,
                status: CopyStatus.AVAILABLE,
              },
            },
          },
          select: { slug: true },
        }),
      ),
    );

    const pessoa = await prisma.user.create({
      data: {
        email: `${PREFIX}-limite@exemplo.test`,
        name: "Pessoa do limite",
        role: Role.MEMBER,
      },
      select: { id: true, role: true },
    });

    // maxActiveReservations = 3 nas configurações do teste.
    for (const obra of obras.slice(0, 3)) {
      await createReservation(pessoa, obra.slug, formFor("Limite"));
    }

    await expect(
      createReservation(pessoa, obras[3].slug, formFor("Limite")),
    ).rejects.toThrow(/limite de 3 reservas ativas/i);
  });

  it("grava o histórico na mesma transação que cria a reserva", async () => {
    const obra = await prisma.book.create({
      data: {
        slug: `${PREFIX}-obra-historico`,
        title: "Obra para conferir o histórico",
        status: "PUBLISHED",
        publishedAt: new Date(),
        searchText: "obra para conferir o historico",
        copies: {
          create: {
            code: `${PREFIX.toUpperCase()}-HIST-001`,
            status: CopyStatus.AVAILABLE,
          },
        },
      },
      select: { slug: true },
    });

    const pessoa = await prisma.user.create({
      data: {
        email: `${PREFIX}-historico@exemplo.test`,
        name: "Pessoa do histórico",
        role: Role.MEMBER,
      },
      select: { id: true, role: true },
    });

    const criada = await createReservation(pessoa, obra.slug, formFor("Historico"));

    const historico = await prisma.reservationHistory.findMany({
      where: { reservationId: criada.id },
      select: { previousStatus: true, newStatus: true, changedById: true },
    });

    // A origem da solicitação é auditável desde o primeiro instante: se o
    // histórico fosse gravado depois da transação, uma falha entre as duas
    // escritas deixaria uma reserva sem registro de como surgiu.
    expect(historico).toHaveLength(1);
    expect(historico[0].previousStatus).toBeNull();
    expect(historico[0].newStatus).toBe(ReservationStatus.PENDING);
    expect(historico[0].changedById).toBe(pessoa.id);
  });
});

describe("alocação de exemplar", () => {
  it("não permite que duas reservas ocupem o mesmo exemplar", async () => {
    // Segunda pessoa solicita a mesma obra — permitido, pois ainda é pendente.
    const second = await createReservation(
      requesterTwo,
      `${PREFIX}-obra-unica`,
      formFor("Dois"),
    );

    const first = await prisma.reservation.findFirstOrThrow({
      where: { userId: requesterOne.id, bookId },
      select: { id: true },
    });

    // A primeira aprovação toma o único exemplar disponível.
    await transitionReservation(staff, {
      reservationId: first.id,
      action: "approve",
    });

    const copy = await prisma.physicalCopy.findFirstOrThrow({ where: { bookId } });
    expect(copy.status).toBe(CopyStatus.RESERVED);

    // A segunda aprovação precisa falhar: não há exemplar livre.
    await expect(
      transitionReservation(staff, {
        reservationId: second.id,
        action: "approve",
      }),
    ).rejects.toThrow(/não há exemplar disponível/i);

    const stillPending = await prisma.reservation.findUniqueOrThrow({
      where: { id: second.id },
      select: { status: true, copyId: true },
    });
    expect(stillPending.status).toBe(ReservationStatus.PENDING);
    expect(stillPending.copyId).toBeNull();
  });

  it("entrega cada exemplar a uma única aprovação, mesmo com aprovações simultâneas", async () => {
    // O teste anterior aprova uma reserva depois da outra. Aqui seis
    // aprovações disputam dois exemplares ao mesmo tempo, cada uma na sua
    // transação e na sua conexão: só a atualização condicional
    // (`status = AVAILABLE`) decide quem fica com cada exemplar.
    const obra = await prisma.book.create({
      data: {
        slug: `${PREFIX}-corrida`,
        title: "Obra disputada",
        status: "PUBLISHED",
        publishedAt: new Date(),
        searchText: "obra disputada",
        copies: {
          create: [
            { code: `${PREFIX.toUpperCase()}-COR-1`, status: CopyStatus.AVAILABLE },
            { code: `${PREFIX.toUpperCase()}-COR-2`, status: CopyStatus.AVAILABLE },
          ],
        },
      },
      select: { id: true, slug: true },
    });

    const pessoas = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((n) =>
        prisma.user.create({
          data: {
            email: `${PREFIX}-corrida-${n}@exemplo.test`,
            name: `Pessoa ${n}`,
            role: Role.MEMBER,
          },
          select: { id: true, role: true },
        }),
      ),
    );
    for (const [i, pessoa] of pessoas.entries()) {
      await createReservation(pessoa, obra.slug, formFor(`Corrida${i + 1}`));
    }
    const pedidos = await prisma.reservation.findMany({
      where: { bookId: obra.id },
      select: { id: true },
    });
    expect(pedidos).toHaveLength(6);

    const resultados = await Promise.allSettled(
      pedidos.map((pedido) =>
        transitionReservation(staff, { reservationId: pedido.id, action: "approve" }),
      ),
    );

    const recusadas = resultados.filter((r) => r.status === "rejected");
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(recusadas).toHaveLength(4);
    for (const r of recusadas) {
      expect((r as PromiseRejectedResult).reason.message).toMatch(
        /não há exemplar disponível/i,
      );
    }

    const aprovadas = await prisma.reservation.findMany({
      where: { bookId: obra.id, status: ReservationStatus.APPROVED },
      select: { copyId: true },
    });
    expect(aprovadas).toHaveLength(2);
    expect(new Set(aprovadas.map((a) => a.copyId)).size).toBe(2);

    const exemplares = await prisma.physicalCopy.findMany({
      where: { bookId: obra.id },
      select: { status: true },
    });
    expect(exemplares.every((c) => c.status === CopyStatus.RESERVED)).toBe(true);
  });

  it("devolve o exemplar ao acervo quando a reserva é cancelada", async () => {
    const approved = await prisma.reservation.findFirstOrThrow({
      where: { userId: requesterOne.id, bookId, status: ReservationStatus.APPROVED },
      select: { id: true },
    });

    await transitionReservation(staff, {
      reservationId: approved.id,
      action: "cancel",
      note: "Teste de liberação do exemplar.",
    });

    const copy = await prisma.physicalCopy.findFirstOrThrow({ where: { bookId } });
    expect(copy.status).toBe(CopyStatus.AVAILABLE);
  });
});

describe("fluxo completo de atendimento", () => {
  it("percorre aprovação, separação, retirada e devolução", async () => {
    const pending = await prisma.reservation.findFirstOrThrow({
      where: { userId: requesterTwo.id, bookId, status: ReservationStatus.PENDING },
      select: { id: true },
    });

    await transitionReservation(staff, { reservationId: pending.id, action: "approve" });
    await expectStatus(pending.id, ReservationStatus.APPROVED);

    await transitionReservation(staff, { reservationId: pending.id, action: "ready" });
    const ready = await prisma.reservation.findUniqueOrThrow({
      where: { id: pending.id },
      select: { status: true, pickupDeadline: true },
    });
    expect(ready.status).toBe(ReservationStatus.READY_FOR_PICKUP);
    // O prazo de retirada é definido no momento da separação.
    expect(ready.pickupDeadline).not.toBeNull();

    await transitionReservation(staff, { reservationId: pending.id, action: "pickup" });
    await expectStatus(pending.id, ReservationStatus.PICKED_UP);
    expect(
      (await prisma.physicalCopy.findFirstOrThrow({ where: { bookId } })).status,
    ).toBe(CopyStatus.IN_USE);

    await transitionReservation(staff, { reservationId: pending.id, action: "return" });
    await expectStatus(pending.id, ReservationStatus.RETURNED);
    expect(
      (await prisma.physicalCopy.findFirstOrThrow({ where: { bookId } })).status,
    ).toBe(CopyStatus.AVAILABLE);

    // Cada passo ficou registrado.
    const history = await prisma.reservationHistory.count({
      where: { reservationId: pending.id },
    });
    expect(history).toBeGreaterThanOrEqual(5);
  });

  it("recusa transição inválida a partir de um estado final", async () => {
    const returned = await prisma.reservation.findFirstOrThrow({
      where: { bookId, status: ReservationStatus.RETURNED },
      select: { id: true },
    });

    await expect(
      transitionReservation(staff, { reservationId: returned.id, action: "approve" }),
    ).rejects.toThrow(/não é possível a partir do estado atual/i);
  });
});

describe("autorização", () => {
  it("impede que uma pessoa comum aprove a própria reserva", async () => {
    const reservation = await createReservation(
      requesterOne,
      `${PREFIX}-obra-unica`,
      formFor("Um"),
    );

    await expect(
      transitionReservation(requesterOne, {
        reservationId: reservation.id,
        action: "approve",
      }),
    ).rejects.toThrow(/permissão/i);
  });

  it("impede que uma pessoa cancele a reserva de outra", async () => {
    const reservation = await prisma.reservation.findFirstOrThrow({
      where: { userId: requesterOne.id, status: ReservationStatus.PENDING },
      select: { id: true },
    });

    await expect(
      transitionReservation(requesterTwo, {
        reservationId: reservation.id,
        action: "cancel",
      }),
    ).rejects.toThrow(/permissão/i);
  });

  it("permite que a pessoa cancele a própria reserva", async () => {
    const reservation = await prisma.reservation.findFirstOrThrow({
      where: { userId: requesterOne.id, status: ReservationStatus.PENDING },
      select: { id: true },
    });

    await transitionReservation(requesterOne, {
      reservationId: reservation.id,
      action: "cancel",
    });

    await expectStatus(reservation.id, ReservationStatus.CANCELLED);
  });
});

async function expectStatus(id: string, status: ReservationStatus) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });
  expect(reservation.status).toBe(status);
}
