import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BookCard } from "@/components/books/book-card";
import {
  ActiveFilters,
  CatalogSearchInput,
  CategoryPills,
  SortSelect,
  type ActiveFilter,
} from "@/components/catalog/catalog-controls";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { Pagination } from "@/components/catalog/pagination";
import { Container, NeabiRule } from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { BookGridSkeleton, EmptyState } from "@/components/ui/feedback";
import { materialTypeLabels } from "@/config/catalog";
import { MaterialType } from "@/generated/prisma/enums";
import { searchBooks } from "@/server/repositories/book-repository";
import {
  getPublishedYearRange,
  listCategoriesWithCounts,
  listContributorsWithCounts,
  listSubjectsWithCounts,
} from "@/server/repositories/taxonomy-repository";
import { recordSearchEvent } from "@/server/services/book-service";
import { getActor } from "@/server/auth/session";
import {
  buildCatalogQuery,
  parseCatalogSearchParams,
} from "@/validators/search";

export const metadata: Metadata = {
  title: "Acervo",
  description:
    "Pesquise o acervo de estudos afro-brasileiros e indígenas do NEABI — CEFET/RJ, campus Nova Iguaçu.",
  alternates: { canonical: "/acervo" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;

  return (
    <>
      <CatalogHeader />
      <Container className="pb-24">
        <Suspense key={JSON.stringify(rawParams)} fallback={<CatalogFallback />}>
          <CatalogResults rawParams={rawParams} />
        </Suspense>
      </Container>
    </>
  );
}

function CatalogHeader() {
  return (
    <section className="border-b border-border bg-surface-muted">
      <Container className="py-14 sm:py-16">
        <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-neabi-red-600">
          Biblioteca NEABI
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[0.95] text-ink-900">
          Acervo
        </h1>
        <NeabiRule className="mt-5" />
        <p className="mt-5 max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-ink-600">
          Obras de estudos afro-brasileiros e indígenas disponíveis para consulta
          presencial. A busca alcança título, subtítulo, autoria, organização,
          instituição, editora, categoria, assunto e ISBN — e ignora diferenças
          de acentuação.
        </p>
      </Container>
    </section>
  );
}

function CatalogFallback() {
  return (
    <div className="pt-10">
      <BookGridSkeleton count={8} />
    </div>
  );
}

async function CatalogResults({
  rawParams,
}: {
  rawParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseCatalogSearchParams(rawParams);

  const [result, categories, subjects, contributors, yearRange, actor] =
    await Promise.all([
      searchBooks(params),
      listCategoriesWithCounts(),
      listSubjectsWithCounts(),
      listContributorsWithCounts(),
      getPublishedYearRange(),
      getActor(),
    ]);

  // Registro de busca alimenta o painel de analytics. Falha aqui nunca
  // compromete a exibição dos resultados (ver `recordSearchEvent`).
  if (params.q.length > 0 && params.page === 1) {
    await recordSearchEvent(params.q, result.total, actor?.id);
  }

  const activeFilters = buildActiveFilters(params, {
    categories,
    subjects,
    contributors,
  });

  return (
    <div className="pt-10">
      <div className="flex flex-col gap-6">
        <div className="max-w-2xl">
          <CatalogSearchInput initialValue={params.q} />
        </div>

        <CategoryPills
          categories={categories
            .filter((category) => category.bookCount > 0)
            .map((category) => ({
              slug: category.slug,
              name: category.name,
              bookCount: category.bookCount,
            }))}
          active={params.category}
        />
      </div>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-12">
        <FilterPanel
          facets={{
            subjects: subjects.map((subject) => ({
              slug: subject.slug,
              name: subject.name,
              bookCount: subject.bookCount,
            })),
            contributors: contributors.map((person) => ({
              slug: person.slug,
              name: person.name,
              bookCount: person.bookCount,
            })),
            materialTypes: Object.values(MaterialType),
            yearRange,
          }}
          activeCount={activeFilters.length}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            {/* `aria-live` avisa leitores de tela quando a contagem muda após
                aplicar um filtro, sem exigir uma navegação completa. */}
            <p aria-live="polite" className="text-[0.9375rem] text-ink-700">
              <strong className="font-semibold text-ink-900">
                {result.total}
              </strong>{" "}
              {result.total === 1 ? "obra encontrada" : "obras encontradas"}
              {params.q ? (
                <>
                  {" "}
                  para <span className="font-medium">“{params.q}”</span>
                </>
              ) : null}
            </p>
            <SortSelect value={params.sort} />
          </div>

          {activeFilters.length > 0 ? (
            <div className="pt-5">
              <ActiveFilters filters={activeFilters} />
            </div>
          ) : null}

          <div className="mt-8">
            {result.items.length === 0 ? (
              <EmptyState
                title="Nenhuma obra encontrada."
                description="Tente pesquisar outro termo ou alterar os filtros."
                action={
                  <Button asChild variant="outline">
                    <Link href="/acervo">Limpar busca e filtros</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="grid grid-cols-2 gap-x-5 gap-y-11 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {result.items.map((book, index) => (
                  <li key={book.id}>
                    <BookCard book={book} priority={index < 4} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={(page) =>
              `/acervo${buildCatalogQuery({ ...params, page })}`
            }
            className="mt-14"
          />
        </div>
      </div>
    </div>
  );
}

/** Traduz os parâmetros da URL em etiquetas legíveis e removíveis. */
function buildActiveFilters(
  params: ReturnType<typeof parseCatalogSearchParams>,
  lookups: {
    categories: { slug: string; name: string }[];
    subjects: { slug: string; name: string }[];
    contributors: { slug: string; name: string }[];
  },
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  const nameFor = (
    list: { slug: string; name: string }[],
    slug: string,
  ): string => list.find((item) => item.slug === slug)?.name ?? slug;

  if (params.category) {
    filters.push({
      key: "category",
      value: params.category,
      label: nameFor(lookups.categories, params.category),
    });
  }
  if (params.subject) {
    filters.push({
      key: "subject",
      value: params.subject,
      label: nameFor(lookups.subjects, params.subject),
    });
  }
  if (params.author) {
    filters.push({
      key: "author",
      value: params.author,
      label: nameFor(lookups.contributors, params.author),
    });
  }
  if (params.type) {
    filters.push({
      key: "type",
      value: params.type,
      label: materialTypeLabels[params.type],
    });
  }
  if (params.availability) {
    filters.push({
      key: "availability",
      value: params.availability,
      label:
        params.availability === "fisico"
          ? "Exemplar físico disponível"
          : "Consulta digital disponível",
    });
  }
  if (params.yearFrom) {
    filters.push({
      key: "yearFrom",
      value: String(params.yearFrom),
      label: `A partir de ${params.yearFrom}`,
    });
  }
  if (params.yearTo) {
    filters.push({
      key: "yearTo",
      value: String(params.yearTo),
      label: `Até ${params.yearTo}`,
    });
  }

  return filters;
}
