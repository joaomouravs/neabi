import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ContactStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  countContactMessagesByStatus,
  findContactMessageById,
  listContactMessagesForAdmin,
  listOtherMessagesFrom,
} from "@/server/repositories/contact-repository";
import { adminContactFiltersSchema } from "@/validators/contact";

/**
 * Caixa de mensagens contra o banco real.
 *
 * Requer o banco de desenvolvimento no ar (`npm run db:dev`). Cada execução
 * cria e remove as próprias mensagens, identificadas pelo e-mail abaixo.
 */

const EMAIL = "teste-integracao-contato@exemplo.org";

let ids: string[] = [];

beforeAll(async () => {
  await prisma.contactMessage.deleteMany({ where: { email: EMAIL } });

  const base = Date.now();
  const rows = [
    { subject: "Doação de obras", status: ContactStatus.NEW, offset: 0 },
    { subject: "Visita ao núcleo", status: ContactStatus.ANSWERED, offset: 1 },
    { subject: "Parceria com escola", status: ContactStatus.ARCHIVED, offset: 2 },
  ];

  ids = [];
  for (const row of rows) {
    const created = await prisma.contactMessage.create({
      data: {
        name: "Pessoa de Teste",
        email: EMAIL,
        subject: row.subject,
        message: `Mensagem de teste sobre ${row.subject.toLowerCase()}.`,
        status: row.status,
        // A mais antiga primeiro: a listagem deve devolver a mais recente no topo.
        createdAt: new Date(base - row.offset * 60_000),
      },
      select: { id: true },
    });
    ids.push(created.id);
  }
});

afterAll(async () => {
  await prisma.contactMessage.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

const filters = (input: Record<string, string>) => adminContactFiltersSchema.parse(input);

describe("caixa de mensagens", () => {
  it("lista da mais recente para a mais antiga", async () => {
    const result = await listContactMessagesForAdmin(filters({ q: EMAIL }));
    expect(result.items.map((item) => item.id)).toEqual(ids);
    expect(result.total).toBe(3);
  });

  it("filtra por situação", async () => {
    const result = await listContactMessagesForAdmin(
      filters({ q: EMAIL, status: ContactStatus.ANSWERED }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].subject).toBe("Visita ao núcleo");
  });

  it("busca no assunto e no texto, sem diferenciar maiúsculas", async () => {
    const bySubject = await listContactMessagesForAdmin(filters({ q: "PARCERIA COM ESCOLA" }));
    expect(bySubject.items.map((item) => item.id)).toContain(ids[2]);

    const byBody = await listContactMessagesForAdmin(filters({ q: "teste sobre doação" }));
    expect(byBody.items.map((item) => item.id)).toContain(ids[0]);
  });

  it("trata curingas do LIKE como texto literal", async () => {
    const result = await listContactMessagesForAdmin(filters({ q: "%" }));
    expect(result.items.map((item) => item.id)).not.toContain(ids[0]);
  });

  it("conta por situação, com zero para as que não têm mensagens", async () => {
    const counts = await countContactMessagesByStatus();
    for (const status of Object.values(ContactStatus)) {
      expect(counts[status]).toBeGreaterThanOrEqual(0);
    }
    expect(counts.NEW).toBeGreaterThanOrEqual(1);
  });

  it("encontra a mensagem e as outras do mesmo remetente", async () => {
    const message = await findContactMessageById(ids[0]);
    expect(message?.status).toBe(ContactStatus.NEW);

    const others = await listOtherMessagesFrom(EMAIL, ids[0]);
    expect(others.map((other) => other.id).sort()).toEqual([ids[1], ids[2]].sort());
  });
});
