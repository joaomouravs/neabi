import { Role } from "@/generated/prisma/enums";

/**
 * Controle de acesso baseado em papéis.
 *
 * Funções puras, sem acesso a banco: podem ser testadas isoladamente e são a
 * única fonte de verdade sobre "quem pode o quê". Nenhuma tela decide permissão
 * por conta própria — a interface apenas reflete o que estas regras dizem.
 */

export const PERMISSIONS = [
  // Acervo
  "book:read:any", // ver obras não publicadas
  "book:create",
  "book:update",
  "book:publish",
  "book:archive",
  "book:delete",
  // Exemplares
  "copy:manage",
  // Taxonomia
  "category:manage",
  // Arquivos
  "asset:upload",
  "asset:delete",
  "asset:authorize", // liberar consulta digital
  // Reservas
  "reservation:create",
  "reservation:read:own",
  "reservation:read:any",
  "reservation:manage",
  // Usuários
  "user:read:any",
  "user:manage",
  "user:change-role",
  // Plataforma
  "analytics:read",
  "settings:manage",
  "contact:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MEMBER_PERMISSIONS: readonly Permission[] = [
  "reservation:create",
  "reservation:read:own",
];

const EDITOR_PERMISSIONS: readonly Permission[] = [
  ...MEMBER_PERMISSIONS,
  "book:read:any",
  "book:create",
  "book:update",
  "book:publish",
  "book:archive",
  "copy:manage",
  "category:manage",
  "asset:upload",
  "asset:delete",
  "reservation:read:any",
  "reservation:manage",
  "analytics:read",
];

/**
 * ADMIN recebe todas as permissões. As que o EDITOR não tem são justamente as
 * "configurações críticas": excluir obras definitivamente, autorizar consulta
 * digital de um PDF, alterar papéis de usuários e editar as configurações
 * institucionais.
 */
const ADMIN_PERMISSIONS: readonly Permission[] = [...PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  MEMBER: MEMBER_PERMISSIONS,
  EDITOR: EDITOR_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
};

export interface Actor {
  id: string;
  role: Role;
}

export function can(
  actor: Actor | null | undefined,
  permission: Permission,
): boolean {
  if (!actor) return false;
  return ROLE_PERMISSIONS[actor.role].includes(permission);
}

export function canAny(
  actor: Actor | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => can(actor, permission));
}

/** Acesso a qualquer rota sob `/admin`. */
export function canAccessAdmin(actor: Actor | null | undefined): boolean {
  return canAny(actor, ["book:create", "reservation:manage", "settings:manage"]);
}

/** Uma reserva é visível para quem a fez e para quem gerencia reservas. */
export function canViewReservation(
  actor: Actor | null | undefined,
  reservation: { userId: string },
): boolean {
  if (!actor) return false;
  if (actor.id === reservation.userId) return true;
  return can(actor, "reservation:read:any");
}

/** O próprio solicitante pode cancelar; a equipe também. */
export function canCancelReservation(
  actor: Actor | null | undefined,
  reservation: { userId: string },
): boolean {
  if (!actor) return false;
  if (actor.id === reservation.userId) return true;
  return can(actor, "reservation:manage");
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
