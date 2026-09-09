import { BookStatus, CopyStatus, ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, todayInLibraryTimeZone } from "@/lib/date";

/**
 * Métricas do painel administrativo.
 *
 * Todas as contagens saem do banco — nada é estimado ou acumulado em memória.
 */

export interface DashboardMetrics {
  books: number;
  publishedBooks: number;
  needsReview: number;
  copies: number;
  availableCopies: number;
  pendingReservations: number;
  approvedReservations: number;
  readyForPickup: number;
  users: number;
  views: number;
  viewsLast30Days: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const since = addDays(todayInLibraryTimeZone(), -30);

  const [
    books,
    publishedBooks,
    needsReview,
    copies,
    availableCopies,
    pendingReservations,
    approvedReservations,
    readyForPickup,
    users,
    views,
    viewsLast30Days,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.book.count({ where: { status: BookStatus.PUBLISHED } }),
    prisma.book.count({ where: { catalogingStatus: "NEEDS_REVIEW" } }),
    prisma.physicalCopy.count(),
    prisma.physicalCopy.count({ where: { status: CopyStatus.AVAILABLE } }),
    prisma.reservation.count({ where: { status: ReservationStatus.PENDING } }),
    prisma.reservation.count({ where: { status: ReservationStatus.APPROVED } }),
    prisma.reservation.count({
      where: { status: ReservationStatus.READY_FOR_PICKUP },
    }),
    prisma.user.count({ where: { active: true } }),
    prisma.bookView.count(),
    prisma.bookView.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    books,
    publishedBooks,
    needsReview,
    copies,
    availableCopies,
    pendingReservations,
    approvedReservations,
    readyForPickup,
    users,
    views,
    viewsLast30Days,
  };
}

/** Obras mais acessadas, com a contagem de visualizações do período. */
export async function getMostViewedBooks(limit = 10, days = 30) {
  const since = addDays(todayInLibraryTimeZone(), -days);

  const grouped = await prisma.bookView.groupBy({
    by: ["bookId"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { bookId: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const books = await prisma.book.findMany({
    where: { id: { in: grouped.map((row) => row.bookId) } },
    select: { id: true, title: true, slug: true, viewCount: true },
  });

  const byId = new Map(books.map((book) => [book.id, book]));

  return grouped
    .map((row) => {
      const book = byId.get(row.bookId);
      if (!book) return null;
      return { ...book, periodViews: row._count._all };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

/** Termos mais buscados, agregados pela forma normalizada. */
export async function getTopSearches(limit = 15, days = 30) {
  const since = addDays(todayInLibraryTimeZone(), -days);

  const grouped = await prisma.searchEvent.groupBy({
    by: ["normalizedQuery"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _max: { query: true, resultCount: true },
    orderBy: { _count: { normalizedQuery: "desc" } },
    take: limit,
  });

  return grouped.map((row) => ({
    query: row._max.query ?? row.normalizedQuery,
    normalizedQuery: row.normalizedQuery,
    searches: row._count._all,
    lastResultCount: row._max.resultCount ?? 0,
  }));
}

/**
 * Buscas sem resultado — o sinal mais acionável do painel: indicam obras que a
 * comunidade procura e o acervo ainda não tem (ou não catalogou).
 */
export async function getEmptySearches(limit = 15, days = 90) {
  const since = addDays(todayInLibraryTimeZone(), -days);

  const grouped = await prisma.searchEvent.groupBy({
    by: ["normalizedQuery"],
    where: { createdAt: { gte: since }, resultCount: 0 },
    _count: { _all: true },
    _max: { query: true },
    orderBy: { _count: { normalizedQuery: "desc" } },
    take: limit,
  });

  return grouped.map((row) => ({
    query: row._max.query ?? row.normalizedQuery,
    searches: row._count._all,
  }));
}

/** Reservas por status — usado no painel e nas abas de filtro. */
export async function getReservationsByStatus() {
  const grouped = await prisma.reservation.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.values(ReservationStatus).map((status) => ({
    status,
    count: grouped.find((row) => row.status === status)?._count._all ?? 0,
  }));
}

/** Categorias com mais obras publicadas. */
export async function getCategoryDistribution() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { books: { where: { book: { status: BookStatus.PUBLISHED } } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories
    .map(({ _count, ...category }) => ({ ...category, bookCount: _count.books }))
    .sort((a, b) => b.bookCount - a.bookCount);
}
