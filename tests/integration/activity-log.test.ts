import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/logger";
import { listActivities } from "@/server/repositories/activity-repository";

/**
 * Registro de atividades contra o banco real.
 *
 * Requer o banco de desenvolvimento no ar. Cria uma conta própria, marcada
 * pelo e-mail abaixo, e apaga tudo o que gerou.
 */

const EMAIL = "teste-integracao-atividades@exemplo.org";
/** Marca os eventos desta execução, para limpá-los mesmo sem autor. */
const RUN = `atividades-${Date.now()}`;
let actorId = "";

async function waitForActivity(event: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const row = await prisma.auditLog.findFirst({
      where: { actorId, event },
      orderBy: { createdAt: "desc" },
    });
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const actor = await prisma.user.create({
    data: { email: EMAIL, name: "Equipe de Teste", role: Role.ADMIN },
    select: { id: true },
  });
  actorId = actor.id;
});

afterAll(async () => {
  // A gravação acontece depois da chamada; espera o que ainda estiver a caminho.
  await new Promise((resolve) => setTimeout(resolve, 500));
  await prisma.auditLog.deleteMany({
    where: { OR: [{ actorId }, { details: { path: ["teste"], equals: RUN } }] },
  });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

describe("registro de atividades", () => {
  it("grava a ação administrativa com quem agiu e sem repetir o autor nos detalhes", async () => {
    audit("conta.papel_alterado", { userId: "alvo", de: "MEMBER", para: "EDITOR", teste: RUN, actorId });

    const row = await waitForActivity("conta.papel_alterado");
    expect(row).not.toBeNull();
    expect(row?.actorId).toBe(actorId);
    expect(row?.details).toEqual({ userId: "alvo", de: "MEMBER", para: "EDITOR", teste: RUN });
  });

  it("redige campos sensíveis antes de gravar", async () => {
    audit("configuracoes.atualizadas", { actorId, teste: RUN, password: "nao-pode-vazar", token: "x" });

    const row = await waitForActivity("configuracoes.atualizadas");
    const stored = JSON.stringify(row?.details);
    expect(stored).not.toContain("nao-pode-vazar");
    expect(stored).toContain("[redigido]");
  });

  it("não grava login nem reservas, que têm outro destino", async () => {
    audit("login.falha", { motivo: "senha_invalida", actorId });
    audit("reserva.transicao", { reservationId: "r", de: "PENDING", para: "APPROVED", actorId });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const count = await prisma.auditLog.count({
      where: { actorId, event: { in: ["login.falha", "reserva.transicao"] } },
    });
    expect(count).toBe(0);
  });

  it("lista do mais recente para o mais antigo e filtra por área", async () => {
    const contas = await listActivities({ group: "contas", page: 1 });
    expect(contas.total).toBeGreaterThan(0);
    expect(contas.items.every((item) => item.event.startsWith("conta."))).toBe(true);

    const todas = await listActivities({ page: 1 });
    const datas = todas.items.map((item) => item.createdAt.getTime());
    expect([...datas].sort((a, b) => b - a)).toEqual(datas);
  });
});
