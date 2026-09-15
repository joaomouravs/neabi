import { cache } from "react";

import { BookStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Categorias, assuntos, tags e autoridades — os eixos de navegação do acervo.
 */

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  sortOrder: number;
  bookCount: number;
}

/**
 * Categorias com a contagem de obras **publicadas**.
 * Memoizada por requisição: os filtros aparecem no acervo e no rodapé.
 */
export const listCategoriesWithCounts = cache(
  async (): Promise<CategoryWithCount[]> => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        featured: true,
        sortOrder: true,
        _count: {
          select: { books: { where: { book: { status: BookStatus.PUBLISHED } } } },
        },
      },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      bookCount: _count.books,
    }));
  },
);

export function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      featured: true,
      sortOrder: true,
      _count: { select: { books: true } },
    },
  });
}

export function findCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  });
}

/** Assuntos com ao menos uma obra publicada, para o painel de filtros. */
export async function listSubjectsWithCounts(limit = 40) {
  const subjects = await prisma.subject.findMany({
    where: { books: { some: { book: { status: BookStatus.PUBLISHED } } } },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { books: { where: { book: { status: BookStatus.PUBLISHED } } } },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return subjects.map(({ _count, ...subject }) => ({
    ...subject,
    bookCount: _count.books,
  }));
}

export async function listContributorsWithCounts(limit = 60) {
  const people = await prisma.person.findMany({
    where: {
      contributions: { some: { book: { status: BookStatus.PUBLISHED } } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          contributions: { where: { book: { status: BookStatus.PUBLISHED } } },
        },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return people.map(({ _count, ...person }) => ({
    ...person,
    bookCount: _count.contributions,
  }));
}

/** Tipos de material presentes no acervo publicado, com contagem. */
export async function listMaterialTypesWithCounts() {
  const grouped = await prisma.book.groupBy({
    by: ["materialType"],
    where: { status: BookStatus.PUBLISHED },
    _count: { _all: true },
  });
  return grouped
    .map((row) => ({ value: row.materialType, bookCount: row._count._all }))
    .sort((a, b) => b.bookCount - a.bookCount);
}

/** Intervalo de anos presente no acervo publicado — limita os filtros de data. */
export async function getPublishedYearRange(): Promise<{
  min: number | null;
  max: number | null;
}> {
  const result = await prisma.book.aggregate({
    where: { status: BookStatus.PUBLISHED, year: { not: null } },
    _min: { year: true },
    _max: { year: true },
  });
  return { min: result._min.year, max: result._max.year };
}
