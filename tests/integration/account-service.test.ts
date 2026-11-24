import "dotenv/config";

import bcrypt from "bcryptjs";
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
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { setMailTransport } from "@/server/notifications";
import type { Actor } from "@/server/permissions/rbac";
import { SETTINGS_ID } from "@/server/repositories/settings-repository";
import {
  DELETED_HOLDER_NAME,
  DELETION_NOTE,
  deleteOwnAccount,
  exportAccountData,
} from "@/server/services/account-service";
import {
  createReservation,
  transitionReservation,
} from "@/server/services/reservation-service";

/**
 * Direitos do titular contra o banco real: a cópia dos dados e a exclusão da
 * conta, que precisa cancelar reservas e devolver exemplares na mesma
 * transação em que apaga os dados pessoais.
 *
 * Requer o banco de desenvolvimento no ar (`npm run db:dev`).
 */

const PREFIX = "teste-conta-titular";
const PASSWORD = "uma senha longa de teste";

let bookId: string;
let member: Actor;
let staff: Actor;
/** A exclusão troca o e-mail da conta: a limpeza também precisa dos ids. */
const userIds: string[] = [];

function validRequestDate(): string {
  let candidate = addDays(todayInLibraryTimeZone(), 2);
  while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
    candidate = addDays(candidate, 1);
  }
  return toISODate(candidate);
}

async function cleanup(): Promise<void> {
  await prisma.reservation.deleteMany({
    where: { book: { slug: { startsWith: PREFIX } } },
  });
  await prisma.physicalCopy.deleteMany({
    where: { book: { slug: { startsWith: PREFIX } } },
  });
  await prisma.book.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.contactMessage.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({
    where: { OR: [{ email: { startsWith: PREFIX } }, { id: { in: userIds } }] },
  });
}

async function createUser(slug: string, role: Role): Promise<Actor> {
  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}-${slug}@exemplo.test`,
      name: `Pessoa ${slug}`,
      role,
      phone: "(21) 98888-7777",
      registrationId: "MAT-123",
      patronType: PatronType.STUDENT,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    },
    select: { id: true, role: true },
  });
  userIds.push(user.id);
  return user;
}

beforeAll(async () => {
  setMailTransport({ async send() {} });
  await cleanup();

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      serviceDays: [1, 2, 3, 4, 5],
      availableShifts: [Shift.MORNING, Shift.AFTERNOON],
      reservationLeadDays: 1,
      reservationHorizonDays: 60,
      maxActiveReservations: 3,
    },
    update: {
      serviceDays: [1, 2, 3, 4, 5],
      availableShifts: [Shift.MORNING, Shift.AFTERNOON],
      reservationLeadDays: 1,
      reservationHorizonDays: 60,
      maxActiveReservations: 3,
    },
  });

  const book = await prisma.book.create({
    data: {
      slug: `${PREFIX}-obra`,
      title: "Obra de teste da conta",
      status: "PUBLISHED",
      publishedAt: new Date(),
      searchText: "obra de teste da conta",
      copies: {
        create: [
          { code: `${PREFIX.toUpperCase()}-001`, status: CopyStatus.AVAILABLE },
          { code: `${PREFIX.toUpperCase()}-002`, status: CopyStatus.AVAILABLE },
        ],
      },
    },
    select: { id: true },
  });
  bookId = book.id;

  member = await createUser("leitora", Role.MEMBER);
  staff = await createUser("equipe", Role.ADMIN);

  // Uma reserva aprovada — com exemplar comprometido — e uma mensagem de contato.
  const reservation = await createReservation(member, `${PREFIX}-obra`, {
    fullName: "Pessoa Leitora",
    email: `${PREFIX}-leitora@exemplo.test`,
    phone: "(21) 98888-7777",
    registrationId: "MAT-123",
    patronType: PatronType.STUDENT,
    requestedDate: validRequestDate(),
    shift: Shift.MORNING,
    purpose: "Pesquisa para o TCC",
    acknowledgement: true,
  });
  await transitionReservation(staff, { reservationId: reservation.id, action: "approve" });

  await prisma.contactMessage.create({
    data: {
      name: "Pessoa Leitora",
      email: `${PREFIX}-LEITORA@exemplo.test`,
      subject: "Dúvida",
      message: "Mensagem de teste",
    },
  });
});

afterAll(async () => {
  await cleanup();
  setMailTransport(null);
  await prisma.$disconnect();
});

describe("cópia dos dados", () => {
  it("reúne cadastro, reservas com histórico e mensagens de contato do titular", async () => {
    const data = await exportAccountData(member);

    expect(data.conta.email).toBe(`${PREFIX}-leitora@exemplo.test`);
    expect(data.conta.telefone).toBe("(21) 98888-7777");
    expect(data.reservas).toHaveLength(1);
    expect(data.reservas[0].situacao).toBe(ReservationStatus.APPROVED);
    expect(data.reservas[0].dadosInformados.finalidade).toBe("Pesquisa para o TCC");
    expect(data.reservas[0].historico.map((entry) => entry.para)).toEqual([
      ReservationStatus.PENDING,
      ReservationStatus.APPROVED,
    ]);
    // O e-mail do contato é comparado sem diferenciar maiúsculas.
    expect(data.mensagensDeContato).toHaveLength(1);
    // Nada de senha, nem cifrada.
    expect(JSON.stringify(data)).not.toContain("$2");
  });
});

describe("exclusão da conta", () => {
  it("recusa senha incorreta sem tocar em nada", async () => {
    await expect(deleteOwnAccount(member, { password: "errada" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(user.deletedAt).toBeNull();
  });

  it("não exclui contas da equipe", async () => {
    await expect(deleteOwnAccount(staff, { password: PASSWORD })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("exige a devolução do exemplar retirado", async () => {
    const holder = await createUser("com-exemplar", Role.MEMBER);
    await prisma.reservation.create({
      data: {
        protocol: `${PREFIX}-RETIRADA`,
        userId: holder.id,
        bookId,
        fullName: "Com exemplar",
        email: `${PREFIX}-com-exemplar@exemplo.test`,
        phone: "(21) 90000-0000",
        patronType: PatronType.STUDENT,
        requestedDate: new Date(),
        shift: Shift.MORNING,
        status: ReservationStatus.PICKED_UP,
      },
    });

    await expect(deleteOwnAccount(holder, { password: PASSWORD })).rejects.toThrow(
      /Devolva-o/,
    );
  });

  it("cancela as reservas, libera o exemplar e apaga os dados pessoais", async () => {
    const result = await deleteOwnAccount(member, { password: PASSWORD });
    expect(result.cancelledReservations).toBe(1);

    const reservation = await prisma.reservation.findFirstOrThrow({
      where: { userId: member.id },
      include: { history: { orderBy: { changedAt: "asc" } } },
    });
    expect(reservation.status).toBe(ReservationStatus.CANCELLED);
    expect(reservation.cancelledAt).not.toBeNull();
    expect(reservation.fullName).toBe(DELETED_HOLDER_NAME);
    expect(reservation.email).toBe("");
    expect(reservation.phone).toBe("");
    expect(reservation.registrationId).toBeNull();
    expect(reservation.purpose).toBeNull();
    expect(reservation.history.at(-1)?.note).toBe(DELETION_NOTE);

    // O exemplar que a aprovação tinha comprometido volta ao acervo.
    const copies = await prisma.physicalCopy.findMany({ where: { bookId } });
    expect(copies.every((copy) => copy.status === CopyStatus.AVAILABLE)).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(user.deletedAt).not.toBeNull();
    expect(user.active).toBe(false);
    expect(user.email).toBe(`excluida-${member.id}@contas.invalid`);
    expect(user.name).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.registrationId).toBeNull();
    expect(user.passwordHash).toBeNull();

    const messages = await prisma.contactMessage.count({
      where: { email: { equals: `${PREFIX}-leitora@exemplo.test`, mode: "insensitive" } },
    });
    expect(messages).toBe(0);
  });

  it("libera o e-mail original e não responde mais pela conta excluída", async () => {
    await expect(exportAccountData(member)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteOwnAccount(member, { password: PASSWORD })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const taken = await prisma.user.findUnique({
      where: { email: `${PREFIX}-leitora@exemplo.test` },
    });
    expect(taken).toBeNull();
  });
});
