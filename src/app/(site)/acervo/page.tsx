import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BookGrid } from "@/components/books/book-grid";
import { BookGridSkeleton } from "@/components/books/book-skeletons";
import {
  ActiveFilters,
  CatalogSearch,
  CategoryPills,
  ClearFiltersButton,
  SortSelect,
  type ActiveFilter,
} from "@/components/catalog/catalog-controls";
import {
  FilterSidebar,
  MobileFilterBar,
  type FilterFacets,
} from "@/components/catalog/filter-panel";
import { Pagination } from "@/components/catalog/pagination";
import { Container, PageHeader } from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { materialTypeLabels } from "@/config/catalog";
import { getActor } from "@/server/auth/session";
import {
  getPublicCatalogStats,
  searchBooks,
} from "@/server/repositories/book-repository";
import {
  getPublishedYearRange,
  listCategoriesWithCounts,
  listContributorsWithCounts,
  listMaterialTypesWithCounts,
  listSubjectsWithCounts,
} from "@/server/repositories/taxonomy-repository";
import { recordSearchEvent } from "@/server/services/book-service";
import {
  buildCatalogQuery,
  parseCatalogSearchParams,
  type CatalogSearchParams,
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
  const params = parseCatalogSearchParams(rawParams);

  return (
    <>
      <CatalogHeader />

      <Container className="pb-20 pt-8 lg:pt-10">
        <div className="max-w-3xl">
          <CatalogSearch initialValue={params.q} />
        </div>

        {/*
          Filtros e resultados ficam em limites de Suspense separados: os
          filtros não dependem da busca e não piscam a cada troca; só a lista
          de obras é recarregada.
        */}
        {/* `minmax(0,1fr)` também no celular: sem ele, a trilha rolável de
            eixos dita a largura mínima da coluna e a página inteira rola na
            horizontal. */}
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:mt-10 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-x-14">
          <Suspense fallback={<FacetsFallback />}>
            <CatalogFacets />
          </Suspense>

          <div className="min-w-0 pt-5 lg:pt-0">
            <Suspense key={JSON.stringify(rawParams)} fallback={<ResultsFallback />}>
              <CatalogResults params={params} />
            </Suspense>
          </div>
        </div>
      </Container>
    </>
  );
}

async function CatalogHeader() {
  const stats = await getPublicCatalogStats();

  return (
    <PageHeader
      eyebrow="Biblioteca NEABI"
      title="Acervo"
      breadcrumbs={[{ href: "/", label: "Início" }, { label: "Acervo" }]}
      description="Obras de estudos afro-brasileiros e indígenas para consulta presencial. A busca alcança título, autoria, organização, editora, eixo, assunto e ISBN — e ignora acentos."
    >
      <dl className="flex gap-10 border-t border-border-strong pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <div className="flex flex-col-reverse gap-1">
          <dt className="text-[0.8125rem] text-ink-600">
            {stats.books === 1 ? "obra catalogada" : "obras catalogadas"}
          </dt>
          <dd className="font-display text-[2.5rem] font-bold leading-none tabular-nums text-ink-900">
            {stats.books}
          </dd>
        </div>
        <div className="flex flex-col-reverse gap-1">
          <dt className="text-[0.8125rem] text-ink-600">
            {stats.availableCopies === 1 ? "exemplar disponível" : "exemplares disponíveis"}
          </dt>
          <dd className="font-display text-[2.5rem] font-bold leading-none tabular-nums text-neabi-green-700">
            {stats.availableCopies}
          </dd>
        </div>
      </dl>
    </PageHeader>
  );
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

function FacetsFallback() {
  return (
    <>
      <div className="lg:hidden">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="hidden flex-col gap-3 lg:flex">
        <Skeleton className="h-7 w-24" />
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </>
  );
}

async function CatalogFacets() {
  const [categories, subjects, contributors, materialTypes, yearRange] =
    await Promise.all([
      listCategoriesWithCounts(),
      listSubjectsWithCounts(),
      listContributorsWithCounts(200),
      listMaterialTypesWithCounts(),
      getPublishedYearRange(),
    ]);

  const facets: FilterFacets = {
    categories: categories
      .filter((category) => category.bookCount > 0)
      .map(({ slug, name, bookCount }) => ({ slug, name, bookCount })),
    subjects: subjects.map(({ slug, name, bookCount }) => ({ slug, name, bookCount })),
    contributors: contributors.map(({ slug, name, bookCount }) => ({
      slug,
      name,
      bookCount,
    })),
    materialTypes,
    yearRange,
  };

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4 lg:hidden">
        <CategoryPills categories={facets.categories} />
        <MobileFilterBar facets={facets} />
      </div>
      <FilterSidebar facets={facets} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

function ResultsFallback() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="hidden h-10 w-52 lg:block" />
      </div>
      <div className="mt-6">
        <BookGridSkeleton count={8} variant="catalog" />
      </div>
    </div>
  );
}

async function CatalogResults({ params }: { params: CatalogSearchParams }) {
  const [result, categories, subjects, contributors, actor] = await Promise.all([
    searchBooks(params),
    listCategoriesWithCounts(),
    listSubjectsWithCounts(),
    listContributorsWithCounts(200),
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

  const summary =
    params.q.length > 0 ? (
      <>
        <strong className="font-semibold text-ink-900">{result.total}</strong>{" "}
        {result.total === 1 ? "resultado" : "resultados"} para{" "}
        <span className="font-medium text-ink-900">“{params.q}”</span>
      </>
    ) : (
      <>
        <strong className="font-semibold text-ink-900">{result.total}</strong>{" "}
        {result.total === 1 ? "obra" : "obras"}
        {activeFilters.length > 0 ? " com os filtros selecionados" : " no acervo"}
      </>
    );

  return (
    <section aria-labelledby="resultados-titulo">
      <h2 id="resultados-titulo" className="sr-only">
        Resultados
      </h2>

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        {/* `aria-live` avisa leitores de tela quando a contagem muda após
            aplicar um filtro, sem exigir uma navegação completa. */}
        <p role="status" aria-live="polite" className="text-[0.9375rem] text-ink-700">
          {summary}
        </p>
        <div className="hidden lg:block">
          <SortSelect />
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="border-b border-border py-4">
          <ActiveFilters filters={activeFilters} />
        </div>
      ) : null}

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            icon={Search}
            headingLevel={3}
            title="Nenhuma obra encontrada"
            description={
              activeFilters.length > 0
                ? "Não encontramos obras para os filtros selecionados. Remova algum filtro ou limpe todos para ver o acervo completo."
                : `Não encontramos obras para “${params.q}”. Confira a grafia ou tente um termo mais amplo — a busca já ignora acentos.`
            }
            action={
              <>
                <ClearFiltersButton />
                <Button asChild variant="outline" size="lg">
                  <Link href="/#eixos">Navegar pelos eixos</Link>
                </Button>
              </>
            }
          />
        ) : (
          <BookGrid books={result.items} variant="catalog" priorityCount={4} />
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => `/acervo${buildCatalogQuery({ ...params, page })}`}
        className="mt-14"
      />
    </section>
  );
}

/** Traduz os parâmetros da URL em etiquetas legíveis e removíveis. */
function buildActiveFilters(
  params: CatalogSearchParams,
  lookups: {
    categories: { slug: string; name: string }[];
    subjects: { slug: string; name: string }[];
    contributors: { slug: string; name: string }[];
  },
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];

  const nameFor = (list: { slug: string; name: string }[], slug: string): string =>
    list.find((item) => item.slug === slug)?.name ?? slug;

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
  if (params.tag) {
    filters.push({ key: "tag", value: params.tag, label: `Tag: ${params.tag}` });
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
