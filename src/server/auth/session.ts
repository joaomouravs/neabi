import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import { ForbiddenError, UnauthenticatedError } from "@/server/errors";
import { can, type Actor, type Permission } from "@/server/permissions/rbac";

import { auth } from "./index";

/**
 * Ponte entre a sessão do Auth.js e o `Actor` usado pelas regras de acesso.
 *
 * `cache` deduplica a leitura da sessão dentro de uma mesma requisição: um
 * layout, uma página e três Server Components podem chamar `getActor()` sem
 * multiplicar o trabalho.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role };
});

export const getSessionUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

/**
 * Exige uma permissão específica. Toda ação sensível passa por aqui — nunca
 * confiamos em `role`, `userId` ou qualquer identificador vindo do cliente.
 */
export async function requirePermission(
  permission: Permission,
): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, permission)) throw new ForbiddenError();
  return actor;
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
): Promise<Actor> {
  const actor = await requireActor();
  if (!permissions.some((permission) => can(actor, permission))) {
    throw new ForbiddenError();
  }
  return actor;
}

/**
 * Versões para **páginas**.
 *
 * `requirePermission` lança `ForbiddenError`, que as Server Actions convertem
 * em mensagem. Numa página, esse erro caía no limite de erro: quem edita o
 * acervo e abria, por um link salvo, uma área exclusiva da administração via
 * "Algo deu errado" com status 500. Aqui a negação usa `forbidden()` — página
 * de acesso negado e status 403 de verdade.
 */
export async function requirePagePermission(permission: Permission): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!can(actor, permission)) forbidden();
  return actor;
}

export async function requireAnyPagePermission(
  permissions: readonly Permission[],
): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!permissions.some((permission) => can(actor, permission))) forbidden();
  return actor;
}
