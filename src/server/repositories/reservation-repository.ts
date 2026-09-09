import { Prisma, ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { escapeLike, normalizeText } from "@/lib/text";
import { ADMIN_PAGE_SIZE } from "@/config/site";
import { ACTIVE_STATUSES } from "@/server/services/reservation-rules";

export const reservationListSelect = {
  id: true,
  protocol: true,
  status: true,
  requestedDate: true,
  shift: true,
  createdAt: true,
  updatedAt: true,
  fullName: true,
  email: true,
  patronType: true,
  book: {
    select: { id: true, slug: true, title: true, coverImage: true, coverAlt: true },
  },
  copy: { select: { id: true, code: true, location: true, shelf: true } },
} satisfies Prisma.ReservationSelect;

export type ReservationListItem = Prisma.ReservationGetPayload<{
  select: typeof reservationListSelect;
}>;

export const reservationDetailSelect = {
  ...reservationListSelect,
  registrationId: true,
  phone: true,
  purpose: true,
  adminNote: true,
  approvedAt: true,
  readyAt: true,
  pickupDeadline: true,
  pickedUpAt: true,
  returnedAt: true,
  cancelledAt: true,
  userId: true,
  user: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true } },
  history: {
    select: {
      id: true,
      previousStatus: true,
      newStatus: true,
      note: true,
      changedAt: true,
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: { changedAt: "asc" },
  },
} satisfies Prisma.ReservationSelect;

export type ReservationDetail = Prisma.ReservationGetPayload<{
  select: typeof reservationDetailSelect;
}>;

export function findReservationById(
  id: string,
): Promise<ReservationDetail | null> {
  return prisma.reservation.findUnique({
    where: { id },
    select: reservationDetailSelect,
  });
}

export function findReservationByProtocol(
  protocol: string,
): Promise<ReservationDetail | null> {
  return prisma.reservation.findUnique({
    where: { protocol },
    select: reservationDetailSelect,
  });
}

/** Reservas do próprio usuário, separadas entre "em andamento" e histórico. */
export async function listUserReservations(
  userId: string,
): Promise<{ active: ReservationListItem[]; history: ReservationListItem[] }> {
  const reservations = await prisma.reservation.findMany({
    where: { userId },
    select: reservationListSelect,
    orderBy: { createdAt: "desc" },
  });

  const activeSet = new Set<ReservationStatus>(ACTIVE_STATUSES);
  return {
    active: reservations.filter((item) => activeSet.has(item.status)),
    history: reservations.filter((item) => !activeSet.has(item.status)),
  };
}

export interface AdminReservationQuery {
  status?: ReservationStatus;
  q?: string;
  page: number;
  perPage?: number;
}

export async function listReservationsForAdmin(query: AdminReservationQuery) {
  const perPage = query.perPage ?? ADMIN_PAGE_SIZE;
  const conditions: Prisma.ReservationWhereInput[] = [];

  if (query.status) conditions.push({ status: query.status });

  const term = (query.q ?? "").trim();
  if (term.length > 0) {
    const escaped = escapeLike(term);
    conditions.push({
      OR: [
        { protocol: { contains: escaped, mode: "insensitive" } },
        { fullName: { contains: escaped, mode: "insensitive" } },
        { email: { contains: escaped, mode: "insensitive" } },
        { book: { searchText: { contains: escapeLike(normalizeText(term)) } } },
      ],
    });
  }

  const where: Prisma.ReservationWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      select: reservationListSelect,
      orderBy: [{ createdAt: "desc" }],
      skip: (query.page - 1) * perPage,
      take: perPage,
    }),
    prisma.reservation.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Contagem por status — alimenta as abas e o painel de visão geral. */
export async function countReservationsByStatus(): Promise<
  Record<ReservationStatus, number>
> {
  const grouped = await prisma.reservation.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const result = Object.fromEntries(
    Object.values(ReservationStatus).map((status) => [status, 0]),
  ) as Record<ReservationStatus, number>;

  for (const row of grouped) {
    result[row.status] = row._count._all;
  }
  return result;
}
