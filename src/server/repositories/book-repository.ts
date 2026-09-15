import { cache } from "react";

import { BookStatus, CopyStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { rankByRelevance } from "@/lib/relevance";
import { escapeLike, tokenizeQuery } from "@/lib/text";
import type { CatalogSearchParams } from "@/validators/search";

/**
 * Acesso a dados do acervo.
 *
 * Sem regra de negócio: apenas consultas e escritas. As decisões (o que é
 * "disponível", quem pode ver um rascunho, quando publicar) vivem nos serviços.
 */

// ---------------------------------------------------------------------------
// Projeções
// ---------------------------------------------------------------------------

/** Campos necessários para renderizar um `BookCard` — nada além disso. */
export const bookCardSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  year: true,
  coverImage: true,
  coverAlt: true,
  materialType: true,
  digitalAvailable: true,
  status: true,
  contributors: {
    select: {
      role: true,
      sortOrder: true,
      person: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
  categories: {
    select: { category: { select: { id: true, name: true, slug: true } } },
    take: 3,
  },
  // Situação de cada exemplar: permite distinguir "em uso" de "sem exemplar"
  // e mostrar quantos existem. São poucos por obra — o custo é desprezível.
  copies: { select: { status: true } },
  _count: {
    select: {
      copies: { where: { status: CopyStatus.AVAILABLE } },
    },
  },
} satisfies Prisma.BookSelect;

export type BookCardRecord = Prisma.BookGetPayload<{
  select: typeof bookCardSelect;
}>;

/** Projeção completa da página da obra. */
export const bookDetailSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  collection: true,
  year: true,
  edition: true,
  language: true,
  pages: true,
  isbn: true,
  materialType: true,
  catalogingStatus: true,
  description: true,
  summary: true,
  notes: true,
  coverImage: true,
  coverAlt: true,
  digitalAvailable: true,
  status: true,
  featured: true,
  viewCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  publisher: { select: { id: true, name: true, slug: true, acronym: true } },
  institution: { select: { id: true, name: true, slug: true, acronym: true } },
  contributors: {
    select: {
      id: true,
      role: true,
      sortOrder: true,
      person: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
  categories: {
    select: { category: { select: { id: true, name: true, slug: true } } },
  },
  subjects: {
    select: { subject: { select: { id: true, name: true, slug: true } } },
  },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
  copies: {
    select: {
      id: true,
      code: true,
      status: true,
      location: true,
      shelf: true,
      condition: true,
    },
    orderBy: { code: "asc" },
  },
  assets: {
    select: {
      id: true,
      kind: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      size: true,
      authorized: true,
      downloadAllowed: true,
    },
  },
} satisfies Prisma.BookSelect;

export type BookDetailRecord = Prisma.BookGetPayload<{
  select: typeof bookDetailSelect;
}>;

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

export interface SearchBooksOptions extends CatalogSearchParams {
  /** Inclui rascunhos e arquivados — reservado ao painel administrativo. */
  includeUnpublished?: boolean;
  status?: BookStatus;
}

/**
 * Monta a cláusula `where` da busca.
 *
 * Cada termo precisa aparecer em `searchText` (semântica E). `searchText` é
 * mantido pelo serviço e concentra título, subtítulo, pessoas, editora,
 * instituição, categorias, assuntos, tags, descrição, coleção, ano e ISBN —
 * todos já normalizados sem acentos, o que faz "etnico" encontrar "étnico".
 */
export function buildBookWhere(options: SearchBooksOptions): Prisma.BookWhereInput {
  const conditions: Prisma.BookWhereInput[] = [];

  if (!options.includeUnpublished) {
    conditions.push({ status: BookStatus.PUBLISHED });
  } else if (options.status) {
    conditions.push({ status: options.status });
  }

  for (const token of tokenizeQuery(options.q)) {
    conditions.push({ searchText: { contains: escapeLike(token) } });
  }

  if (options.category) {
    conditions.push({
      categories: { some: { category: { slug: options.category } } },
    });
  }

  if (options.subject) {
    conditions.push({
      subjects: { some: { subject: { slug: options.subject } } },
    });
  }

  if (options.tag) {
    conditions.push({ tags: { some: { tag: { slug: options.tag } } } });
  }

  if (options.author) {
    conditions.push({
      contributors: { some: { person: { slug: options.author } } },
    });
  }

  if (options.type) {
    conditions.push({ materialType: options.type });
  }

  if (options.yearFrom !== undefined || options.yearTo !== undefined) {
    conditions.push({
      year: {
        ...(options.yearFrom !== undefined ? { gte: options.yearFrom } : {}),
        ...(options.yearTo !== undefined ? { lte: options.yearTo } : {}),
      },
    });
  }

  if (options.availability === "fisico") {
    conditions.push({ copies: { some: { status: CopyStatus.AVAILABLE } } });
  }

  if (options.availability === "digital") {
    conditions.push({ digitalAvailable: true });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function buildOrderBy(
  sort: CatalogSearchParams["sort"],
): Prisma.BookOrderByWithRelationInput[] {
  switch (sort) {
    case "titulo-asc":
      return [{ title: "asc" }];
    case "titulo-desc":
      return [{ title: "desc" }];
    case "ano-desc":
      return [{ year: { sort: "desc", nulls: "last" } }, { title: "asc" }];
    case "ano-asc":
      return [{ year: { sort: "asc", nulls: "last" } }, { title: "asc" }];
    case "acessos":
      return [{ viewCount: "desc" }, { title: "asc" }];
    case "recentes":
    default:
      return [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ];
  }
}

export interface PaginatedBooks {
  items: BookCardRecord[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function searchBooks(
  options: SearchBooksOptions,
): Promise<PaginatedBooks> {
  const where = buildBookWhere(options);
  const perPage = options.perPage;
  const skip = (options.page - 1) * perPage;

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      select: bookCardSelect,
      orderBy: buildOrderBy(options.sort),
      skip,
      take: perPage,
    }),
    prisma.book.count({ where }),
  ]);

  return {
    items,
    total,
    page: options.page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export interface PublicCatalogStats {
  books: number;
  categories: number;
  totalCopies: number;
  availableCopies: number;
}

/**
 * Números do acervo publicado.
 *
 * Memoizados por requisição: o hero, a seção "Descubra o acervo" e o bloco
 * institucional da home leem a mesma contagem. Exemplares extraviados não
 * contam como acervo.
 */
export const getPublicCatalogStats = cache(async (): Promise<PublicCatalogStats> => {
  const publishedBook = { status: BookStatus.PUBLISHED };
  const [books, categories, totalCopies, availableCopies] = await Promise.all([
    prisma.book.count({ where: publishedBook }),
    prisma.category.count({
      where: { books: { some: { book: publishedBook } } },
    }),
    prisma.physicalCopy.count({
      where: { book: publishedBook, status: { not: CopyStatus.LOST } },
    }),
    prisma.physicalCopy.count({
      where: { book: publishedBook, status: CopyStatus.AVAILABLE },
    }),
  ]);
  return { books, categories, totalCopies, availableCopies };
});

/**
 * Sugestões rápidas da busca.
 *
 * Usa a mesma cláusula `where` do acervo — o que aparece na sugestão é
 * exatamente o que o Enter vai encontrar em `/acervo?q=…`.
 */
export async function findSearchSuggestions(
  q: string,
  limit = 6,
): Promise<{ items: BookCardRecord[]; total: number }> {
  const where = buildBookWhere({
    q,
    sort: "recentes",
    page: 1,
    perPage: limit,
  });

  // Candidatos mais acessados primeiro; a ordem final vem da relevância.
  const [candidates, total] = await Promise.all([
    prisma.book.findMany({
      where,
      select: bookCardSelect,
      orderBy: [{ viewCount: "desc" }, { title: "asc" }],
      take: Math.max(limit * 6, 36),
    }),
    prisma.book.count({ where }),
  ]);

  return { items: rankByRelevance(candidates, q).slice(0, limit), total };
}


/**
 * Obras cujo texto indexado menciona um território.
 *
 * Alimenta a seção "Memória e território" da home a partir do que está
 * catalogado — nenhum slug fixo no código.
 */
export function findBooksMentioning(
  term: string,
  limit = 4,
): Promise<BookCardRecord[]> {
  return prisma.book.findMany({
    where: buildBookWhere({ q: `"${term}"`, sort: "recentes", page: 1, perPage: limit }),
    select: bookCardSelect,
    orderBy: [{ featured: "desc" }, { viewCount: "desc" }, { title: "asc" }],
    take: limit,
  });
}

/**
 * Obras catalogadas mais recentemente, com o intervalo de datas do acervo.
 *
 * O intervalo permite à home decidir se "recém-catalogadas" diz algo real:
 * quando o acervo inteiro entrou no mesmo dia, a seção seria só uma repetição
 * dos destaques com outro nome.
 */
export async function findRecentlyCataloged(limit = 4): Promise<{
  items: BookCardRecord[];
  spanDays: number;
}> {
  const [items, range] = await Promise.all([
    prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED },
      select: bookCardSelect,
      orderBy: [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: limit,
    }),
    prisma.book.aggregate({
      where: { status: BookStatus.PUBLISHED, publishedAt: { not: null } },
      _min: { publishedAt: true },
      _max: { publishedAt: true },
    }),
  ]);

  const min = range._min.publishedAt?.getTime();
  const max = range._max.publishedAt?.getTime();
  const spanDays =
    min !== undefined && max !== undefined
      ? Math.floor((max - min) / 86_400_000)
      : 0;

  return { items, spanDays };
}

// ---------------------------------------------------------------------------
// Leitura pontual
// ---------------------------------------------------------------------------

export function findBookBySlug(
  slug: string,
  options: { includeUnpublished?: boolean } = {},
): Promise<BookDetailRecord | null> {
  return prisma.book.findFirst({
    where: {
      slug,
      ...(options.includeUnpublished ? {} : { status: BookStatus.PUBLISHED }),
    },
    select: bookDetailSelect,
  });
}

export function findBookById(id: string): Promise<BookDetailRecord | null> {
  return prisma.book.findUnique({ where: { id }, select: bookDetailSelect });
}

export function findFeaturedBooks(limit: number): Promise<BookCardRecord[]> {
  return prisma.book.findMany({
    where: { status: BookStatus.PUBLISHED },
    select: bookCardSelect,
    orderBy: [
      { featured: "desc" },
      { publishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: limit,
  });
}

/** Obras relacionadas por categoria compartilhada, excluindo a própria obra. */
export function findRelatedBooks(
  bookId: string,
  categoryIds: readonly string[],
  limit = 4,
): Promise<BookCardRecord[]> {
  if (categoryIds.length === 0) return Promise.resolve([]);
  return prisma.book.findMany({
    where: {
      id: { not: bookId },
      status: BookStatus.PUBLISHED,
      categories: { some: { categoryId: { in: [...categoryIds] } } },
    },
    select: bookCardSelect,
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export function listAllPublishedSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.book.findMany({
    where: { status: BookStatus.PUBLISHED },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function slugExists(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const found = await prisma.book.findFirst({
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}
