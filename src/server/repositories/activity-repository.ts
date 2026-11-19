import { ADMIN_PAGE_SIZE } from "@/config/site";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Grupos de eventos usados no filtro da tela de atividades. */
export const ACTIVITY_GROUPS = {
  acervo: "acervo.",
  arquivos: "arquivo.",
  contas: "conta.",
  configuracoes: "configuracoes.",
  mensagens: "contato.",
} as const;

export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;

export function isActivityGroup(value: unknown): value is ActivityGroup {
  return typeof value === "string" && value in ACTIVITY_GROUPS;
}

export interface ActivityRecord {
  id: string;
  event: string;
  details: Record<string, unknown>;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string } | null;
}

/**
 * Lista o registro de atividades, do mais recente para o mais antigo, com os
 * nomes atuais das obras e contas citadas — o evento guarda só identificadores.
 */
export async function listActivities(options: { group?: ActivityGroup; page: number }) {
  const where: Prisma.AuditLogWhereInput = options.group
    ? { event: { startsWith: ACTIVITY_GROUPS[options.group] } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (options.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        event: true,
        details: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const items: ActivityRecord[] = rows.map((row) => ({
    ...row,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {},
  }));

  const ids = (key: string) =>
    [...new Set(items.map((item) => item.details[key]).filter((v): v is string => typeof v === "string"))];

  const [books, users] = await Promise.all([
    prisma.book.findMany({ where: { id: { in: ids("bookId") } }, select: { id: true, title: true } }),
    prisma.user.findMany({
      where: { id: { in: ids("userId") } },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return {
    items,
    total,
    page: options.page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    books: new Map(books.map((book) => [book.id, book.title])),
    users: new Map(users.map((user) => [user.id, user.name ?? user.email])),
  };
}
