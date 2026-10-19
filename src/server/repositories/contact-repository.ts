import { ADMIN_PAGE_SIZE } from "@/config/site";
import { Prisma } from "@/generated/prisma/client";
import { ContactStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { escapeLike } from "@/lib/text";
import type { AdminContactFilters } from "@/validators/contact";

/**
 * Mensagens do formulário de contato.
 *
 * Em produção o envio de e-mail está desligado (`MAIL_DRIVER=console`): a caixa
 * do painel é o único lugar onde a equipe lê o que chega pelo site.
 */

const contactListSelect = {
  id: true,
  name: true,
  email: true,
  subject: true,
  message: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ContactMessageSelect;

export async function listContactMessagesForAdmin(filters: AdminContactFilters) {
  const conditions: Prisma.ContactMessageWhereInput[] = [];

  if (filters.status) conditions.push({ status: filters.status });

  const term = filters.q.trim();
  if (term.length > 0) {
    const escaped = escapeLike(term);
    conditions.push({
      OR: [
        { name: { contains: escaped, mode: "insensitive" } },
        { email: { contains: escaped, mode: "insensitive" } },
        { subject: { contains: escaped, mode: "insensitive" } },
        { message: { contains: escaped, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.ContactMessageWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      select: contactListSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return {
    items,
    total,
    page: filters.page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

/** Contagem por situação — alimenta as abas e o selo do menu. */
export async function countContactMessagesByStatus(): Promise<
  Record<ContactStatus, number>
> {
  const grouped = await prisma.contactMessage.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const result = Object.fromEntries(
    Object.values(ContactStatus).map((status) => [status, 0]),
  ) as Record<ContactStatus, number>;

  for (const row of grouped) {
    result[row.status] = row._count._all;
  }
  return result;
}

export function findContactMessageById(id: string) {
  return prisma.contactMessage.findUnique({
    where: { id },
    select: contactListSelect,
  });
}

/**
 * Outras mensagens do mesmo endereço — contexto para quem responde (a pessoa
 * já escreveu antes? sobre o quê?).
 */
export function listOtherMessagesFrom(email: string, exceptId: string) {
  return prisma.contactMessage.findMany({
    where: { email, id: { not: exceptId } },
    select: { id: true, subject: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}
