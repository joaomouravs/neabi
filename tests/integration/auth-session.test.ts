import "dotenv/config";

import type { JWT } from "next-auth/jwt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/server/auth/config";

/**
 * A sessão confere a conta no banco a cada leitura.
 *
 * O token vale sete dias. Se o papel e a situação da conta só fossem lidos no
 * login, desativar uma conta ou rebaixar uma pessoa administradora não teria
 * efeito até o token expirar — era o que acontecia.
 *
 * Requer o banco de desenvolvimento no ar (`npm run db:dev`).
 */

const EMAIL = "teste-integracao-sessao@exemplo.org";
let userId: string;

// O callback recebe mais campos; para esta regra só importam `token` e `user`.
const jwt = authConfig.callbacks!.jwt! as unknown as (params: {
  token: JWT;
  user?: unknown;
}) => Promise<JWT | null>;

const tokenDe = (role: Role): JWT => ({ id: userId, role, name: "Pessoa de Teste" });

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: { email: EMAIL, name: "Pessoa de Teste", role: Role.ADMIN, active: true },
    select: { id: true },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

describe("sessão", () => {
  it("mantém a sessão de uma conta ativa com o papel atual", async () => {
    const token = await jwt({ token: tokenDe(Role.ADMIN) });
    expect(token?.role).toBe(Role.ADMIN);
  });

  it("aplica um rebaixamento sem exigir novo login", async () => {
    await prisma.user.update({ where: { id: userId }, data: { role: Role.MEMBER } });
    const token = await jwt({ token: tokenDe(Role.ADMIN) });
    expect(token?.role).toBe(Role.MEMBER);
  });

  it("encerra a sessão de uma conta desativada", async () => {
    await prisma.user.update({ where: { id: userId }, data: { active: false } });
    expect(await jwt({ token: tokenDe(Role.MEMBER) })).toBeNull();
  });

  it("encerra a sessão de uma conta que deixou de existir", async () => {
    expect(await jwt({ token: { id: "conta-inexistente", role: Role.ADMIN } })).toBeNull();
  });

  it("encerra a sessão de um token sem identificação", async () => {
    expect(await jwt({ token: { role: Role.ADMIN } })).toBeNull();
  });
});
