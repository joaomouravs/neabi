import { ArrowRight, BookOpen, MapPin } from "lucide-react";
import Link from "next/link";
import { cache, Suspense, type ReactNode } from "react";

import { BookCard } from "@/components/books/book-card";
import { BookCover } from "@/components/books/book-cover";
import { BookGrid } from "@/components/books/book-grid";
import { BookGridSkeleton } from "@/components/books/book-skeletons";
import { SearchCombobox } from "@/components/catalog/search-combobox";
import { CoverComposition } from "@/components/home/cover-composition";
import {
  Container,
  Eyebrow,
  NeabiRule,
  SectionHeading,
} from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { categoryTone, type NeabiTone } from "@/config/catalog";
import { FEATURED_BOOKS_LIMIT } from "@/config/site";
import { formatCredit } from "@/lib/credits";
import { cn } from "@/lib/utils";
import {
  findBooksMentioning,
  findFeaturedBooks,
  findRecentlyCataloged,
  getPublicCatalogStats,
} from "@/server/repositories/book-repository";
import {
  listCategoriesWithCounts,
  listContributorsWithCounts,
} from "@/server/repositories/taxonomy-repository";

/** O hero e os destaques leem a mesma lista: uma consulta por requisição. */
const getFeatured = cache(() => findFeaturedBooks(FEATURED_BOOKS_LIMIT));

const TONE_BG: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <FeaturedCollection />
      </Suspense>
      <Suspense fallback={null}>
        <DiscoverSection />
      </Suspense>
      <Suspense fallback={null}>
        <CategoryIndex />
      </Suspense>
      <Suspense fallback={null}>
        <RecentlyCataloged />
      </Suspense>
      <Suspense fallback={null}>
        <TerritorySection />
      </Suspense>
      <Suspense fallback={null}>
        <AboutSection />
      </Suspense>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

/**
 * O texto e a busca chegam no HTML inicial — são o conteúdo principal da
 * dobra. Números e capas dependem do banco e chegam logo depois, cada um no
 * seu próprio limite de Suspense, com espaço reservado para não empurrar nada.
 */
function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="on-dark relative isolate overflow-hidden bg-neabi-black text-neabi-cream"
    >
      <div
        aria-hidden="true"
        className="neabi-pattern pointer-events-none absolute inset-0 -z-10 text-neabi-cream opacity-[0.045]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[40%] bg-[#151413] lg:block"
      />

      <Container className="grid items-center gap-12 pb-14 pt-10 sm:pb-16 sm:pt-14 lg:min-h-[min(46rem,calc(100dvh-var(--header-height)))] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14 lg:py-16">
        <div className="min-w-0 max-w-2xl">
          <Eyebrow tone="dark">Núcleo de Estudos Afro-Brasileiros e Indígenas</Eyebrow>

          <h1
            id="hero-titulo"
            className="mt-6 text-balance font-display text-display-xl font-bold text-neabi-cream"
          >
            Biblioteca NEABI
          </h1>

          <NeabiRule className="mt-7 w-28" />

          <p className="mt-6 max-w-xl text-pretty text-lede text-neabi-cream/80">
            Acervo de estudos afro-brasileiros e indígenas
          </p>

          <div className="mt-9">
            <SearchCombobox variant="hero" />
          </div>

          <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <Button asChild variant="onDark" size="lg">
              <Link href="/acervo">
                Explorar acervo
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="onDarkOutline" size="lg">
              <Link href="/sobre">Conhecer o NEABI</Link>
            </Button>
          </div>

          <Suspense fallback={<HeroStatsFallback />}>
            <HeroStats />
          </Suspense>
        </div>

        <div className="hidden min-w-0 md:block">
          <Suspense fallback={<div className="mx-auto aspect-[6/5] w-full max-w-[36rem]" />}>
            <HeroCovers />
          </Suspense>
        </div>
      </Container>
      <div aria-hidden="true" className="neabi-rule h-1 w-full" />
    </section>
  );
}

function HeroStatsFallback() {
  return <div className="mt-10 h-[4.75rem] border-t border-neabi-cream/15 sm:max-w-xl" />;
}

async function HeroStats() {
  const stats = await getPublicCatalogStats();

  const items = [
    {
      value: String(stats.books),
      label: stats.books === 1 ? "obra catalogada" : "obras catalogadas",
    },
    {
      value: String(stats.categories),
      label: stats.categories === 1 ? "eixo temático" : "eixos temáticos",
    },
    { value: "Presencial", label: "consulta no campus" },
  ];

  return (
    <dl className="mt-10 grid grid-cols-[auto_auto_1fr] gap-x-6 gap-y-3 border-t border-neabi-cream/15 pt-5 sm:max-w-xl sm:gap-x-10">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col-reverse gap-1">
          <dt className="text-[0.75rem] leading-snug text-neabi-cream/65 sm:text-[0.8125rem]">
            {item.label}
          </dt>
          <dd className="font-display text-[1.75rem] font-semibold leading-none tabular-nums text-neabi-cream sm:text-[2.125rem]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

async function HeroCovers() {
  const books = await getFeatured();
  return <CoverComposition books={books} />;
}

// ---------------------------------------------------------------------------
// Acervo em destaque
// ---------------------------------------------------------------------------

function SectionFallback() {
  return (
    <Container className="section-y">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-10 w-72 max-w-full" />
      <div className="mt-10">
        <BookGridSkeleton count={4} />
      </div>
    </Container>
  );
}

async function FeaturedCollection() {
  const books = await getFeatured();

  return (
    <section aria-labelledby="destaques-titulo" className="section-y">
      <Container>
        <SectionHeading
          id="destaques-titulo"
          eyebrow="Acervo em destaque"
          title="Obras para começar a leitura"
          description="Uma seleção do acervo físico do NEABI, disponível para consulta presencial mediante reserva."
          action={
            <Button asChild variant="outline">
              <Link href="/acervo">
                Ver acervo completo
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        <div className="mt-10">
          {books.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhuma obra publicada ainda"
              description="Assim que a catalogação começar, as obras aparecerão aqui."
            />
          ) : (
            // Trilho com rolagem lateral no celular (as capas continuam
            // grandes); grade a partir do tablet.
            <ul
              aria-label="Obras em destaque"
              className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 lg:gap-6"
            >
              {books.map((book) => (
                <li
                  key={book.id}
                  className="w-[72%] shrink-0 snap-start min-[480px]:w-[44%] md:w-auto"
                >
                  <BookCard book={book} layout="vertical" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Descubra o acervo
// ---------------------------------------------------------------------------

async function DiscoverSection() {
  const [categories, contributors, stats] = await Promise.all([
    listCategoriesWithCounts(),
    listContributorsWithCounts(200),
    getPublicCatalogStats(),
  ]);

  const themes = categories
    .filter((category) => category.bookCount > 0)
    .sort((a, b) => b.bookCount - a.bookCount)
    .slice(0, 6);

  const people = [...contributors]
    .sort((a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 5);

  if (stats.books === 0) return null;

  return (
    <section
      aria-labelledby="descubra-titulo"
      className="section-y border-y border-border bg-surface-muted"
    >
      <Container>
        <SectionHeading
          id="descubra-titulo"
          eyebrow="Para quem está chegando"
          title="Descubra o acervo"
          description="Não sabe exatamente o que procurar? Comece por um tema, por quem escreveu ou percorra todas as obras."
        />

        <div className="mt-10 grid gap-px border border-border-strong bg-border-strong lg:grid-cols-3">
          <DiscoverPanel index="01" title="Explorar por tema">
            <p className="text-[0.9375rem] leading-relaxed text-ink-600">
              Os eixos atravessam educação, história, direitos, memória e pesquisa.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {themes.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/acervo?category=${category.slug}`}
                    className="inline-flex min-h-10 items-center gap-2 border border-ink-900/15 bg-surface px-3 text-[0.875rem] text-ink-800 transition-colors hover:border-ink-900 hover:text-ink-900"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5", TONE_BG[categoryTone(category.slug)])}
                    />
                    {category.name}
                    <span className="tabular-nums text-ink-500">{category.bookCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <PanelLink href="#eixos">Ver todos os {stats.categories} eixos</PanelLink>
          </DiscoverPanel>

          <DiscoverPanel index="02" title="Explorar por autores">
            <p className="text-[0.9375rem] leading-relaxed text-ink-600">
              Pesquisadoras, pesquisadores, organizações e coletivos presentes no
              acervo.
            </p>
            <ul className="mt-5 border-t border-border">
              {people.map((person) => (
                <li key={person.slug} className="border-b border-border">
                  <Link
                    href={`/acervo?author=${person.slug}`}
                    className="group flex min-h-11 items-center justify-between gap-4 py-2 text-[0.9375rem] text-ink-800 transition-colors hover:text-neabi-red-700"
                  >
                    <span className="truncate">{person.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-[0.8125rem] tabular-nums text-ink-500">
                      {person.bookCount} {person.bookCount === 1 ? "obra" : "obras"}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <PanelLink href="/acervo">Buscar outra autoria no acervo</PanelLink>
          </DiscoverPanel>

          <DiscoverPanel index="03" title="Explorar todas as obras" dark>
            <p className="text-[0.9375rem] leading-relaxed text-neabi-cream/70">
              O catálogo completo, com busca, filtros e ordenação.
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-6 border-t border-neabi-cream/15 pt-6">
              <div className="flex flex-col-reverse gap-1.5">
                <dt className="text-[0.8125rem] leading-snug text-neabi-cream/65">
                  {stats.books === 1 ? "obra catalogada" : "obras catalogadas"}
                </dt>
                <dd className="font-display text-5xl font-bold leading-none tabular-nums">
                  {stats.books}
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-1.5">
                <dt className="text-[0.8125rem] leading-snug text-neabi-cream/65">
                  {stats.availableCopies === 1
                    ? "exemplar disponível agora"
                    : "exemplares disponíveis agora"}
                </dt>
                <dd className="font-display text-5xl font-bold leading-none tabular-nums text-neabi-amber">
                  {stats.availableCopies}
                </dd>
              </div>
            </dl>
            <div className="mt-auto pt-8">
              <Button asChild variant="onDark" size="lg" className="w-full">
                <Link href="/acervo">
                  Ver todas as obras
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </DiscoverPanel>
        </div>
      </Container>
    </section>
  );
}

function DiscoverPanel({
  index,
  title,
  dark = false,
  children,
}: {
  index: string;
  title: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col p-6 sm:p-8",
        dark ? "on-dark bg-neabi-black text-neabi-cream" : "bg-background",
      )}
    >
      <p
        aria-hidden="true"
        className={cn(
          "font-sans text-[0.75rem] font-semibold tabular-nums",
          dark ? "text-neabi-amber" : "text-neabi-red-600",
        )}
      >
        {index}
      </p>
      <h3
        className={cn(
          "mt-3 font-display text-[1.875rem] font-bold leading-tight",
          dark ? "text-neabi-cream" : "text-ink-900",
        )}
      >
        {title}
      </h3>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="mt-auto pt-7">
      <Link
        href={href}
        className="group inline-flex items-center gap-2 text-[0.875rem] font-semibold text-ink-900"
      >
        <span className="link-underline">{children}</span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
        />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eixos do acervo
// ---------------------------------------------------------------------------

async function CategoryIndex() {
  const categories = (await listCategoriesWithCounts()).filter(
    (category) => category.bookCount > 0,
  );

  if (categories.length === 0) return null;

  return (
    <section id="eixos" aria-labelledby="eixos-titulo" className="section-y scroll-mt-24">
      <Container>
        <SectionHeading
          id="eixos-titulo"
          eyebrow="Navegar por tema"
          title="Eixos do acervo"
          description="O acervo se organiza em eixos que atravessam educação, história, direitos, memória e produção de pesquisa."
        />

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {categories.map((category, index) => {
            const tone = categoryTone(category.slug);
            const descriptionId = `eixo-${category.slug}-descricao`;
            const count = `${category.bookCount} ${category.bookCount === 1 ? "obra" : "obras"}`;
            return (
              <li key={category.id}>
                <Link
                  href={`/acervo?category=${category.slug}`}
                  aria-label={`${category.name} — ${count}`}
                  aria-describedby={category.description ? descriptionId : undefined}
                  className="group relative flex h-full flex-col overflow-hidden border border-border bg-surface p-6 transition-[transform,box-shadow,border-color] duration-200 ease-editorial hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card motion-reduce:hover:translate-y-0 sm:p-7"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.22] transition-transform duration-300 ease-editorial group-hover:scale-x-100 group-focus-visible:scale-x-100",
                      TONE_BG[tone],
                    )}
                  />
                  <span className="flex items-baseline justify-between gap-4">
                    <span aria-hidden="true" className="font-sans text-[0.75rem] tabular-nums text-ink-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-sans text-[0.8125rem] font-semibold tabular-nums text-ink-700">
                      {count}
                    </span>
                  </span>
                  <span className="mt-6 font-display text-[1.625rem] font-semibold leading-tight text-ink-900">
                    {category.name}
                  </span>
                  {category.description ? (
                    <span
                      id={descriptionId}
                      className="mt-2 line-clamp-3 text-pretty text-[0.9375rem] leading-relaxed text-ink-600"
                    >
                      {category.description}
                    </span>
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="mt-auto inline-flex items-center gap-2 pt-6 text-[0.875rem] font-semibold text-ink-800 transition-colors group-hover:text-neabi-red-700"
                  >
                    Ver obras
                    <ArrowRight className="size-4 -translate-x-1 opacity-50 transition-[transform,opacity] duration-200 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transform-none" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recém-catalogadas
// ---------------------------------------------------------------------------

/**
 * Só aparece quando o acervo tem datas de catalogação distintas. Enquanto
 * todas as obras vêm do mesmo lote inicial, a seção repetiria os destaques com
 * outro nome — e a promessa de "recente" seria falsa.
 */
async function RecentlyCataloged() {
  const { items, spanDays } = await findRecentlyCataloged(4);
  if (items.length === 0 || spanDays < 1) return null;

  return (
    <section aria-labelledby="recentes-titulo" className="section-y border-t border-border">
      <Container>
        <SectionHeading
          id="recentes-titulo"
          eyebrow="Acervo em crescimento"
          title="Recém-catalogadas"
          description="As obras que entraram por último no catálogo do NEABI."
          action={
            <Button asChild variant="outline">
              <Link href="/acervo?sort=recentes">Ver mais recentes</Link>
            </Button>
          }
        />
        <div className="mt-10">
          <BookGrid books={items} />
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Memória e território
// ---------------------------------------------------------------------------

/**
 * Obras do acervo que tratam da Baixada Fluminense — o território do campus.
 * A seleção vem do texto catalogado; sem obras sobre o tema, a seção some.
 */
async function TerritorySection() {
  const [books, categories] = await Promise.all([
    findBooksMentioning("baixada fluminense", 4),
    listCategoriesWithCounts(),
  ]);

  if (books.length === 0) return null;

  const [feature, ...others] = books;
  const memoria = categories.find(
    (category) => category.slug === "memoria-e-ancestralidade" && category.bookCount > 0,
  );
  const featureCategory = feature.categories[0]?.category;
  const featureCredit = formatCredit(feature.contributors);

  return (
    <section
      aria-labelledby="territorio-titulo"
      className="on-dark relative isolate overflow-hidden bg-neabi-green-900 text-neabi-cream"
    >
      <div
        aria-hidden="true"
        className="neabi-pattern-rows pointer-events-none absolute inset-0 -z-10 text-neabi-cream opacity-[0.035]"
      />
      <Container className="section-y grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <Eyebrow tone="dark">
            <MapPin aria-hidden="true" className="-ml-1 size-3.5" />
            Baixada Fluminense
          </Eyebrow>
          <h2
            id="territorio-titulo"
            className="mt-4 text-balance font-display text-display-md font-bold text-neabi-cream"
          >
            Memória e território
          </h2>
          <NeabiRule className="mt-6" />
          <p className="mt-6 text-pretty text-lede text-neabi-cream/80">
            O NEABI do CEFET/RJ está em Nova Iguaçu, na Baixada Fluminense —
            território marcado pela presença histórica de populações negras e
            indígenas. Estas obras do acervo tratam dessa história e dessa
            ancestralidade.
          </p>
          {memoria ? (
            <div className="mt-8">
              <Button asChild variant="onDarkOutline">
                <Link href={`/acervo?category=${memoria.slug}`}>
                  Eixo {memoria.name}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <article className="group relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-5 border border-neabi-cream/15 bg-neabi-black/35 p-5 transition-colors hover:border-neabi-cream/35 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-neabi-amber sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-7 sm:p-7">
            <BookCover
              title={feature.title}
              coverImage={feature.coverImage}
              coverAlt={feature.coverAlt}
              tone={categoryTone(featureCategory?.slug)}
              categoryName={featureCategory?.name}
              credit={featureCredit}
              sizes="(min-width: 640px) 160px, 104px"
              theme="light"
              decorative
              className="shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)]"
            />
            <div className="flex min-w-0 flex-col">
              {featureCategory ? (
                <p className="eyebrow text-neabi-amber">{featureCategory.name}</p>
              ) : null}
              <h3 className="mt-2 text-balance font-display text-[1.625rem] font-bold leading-tight text-neabi-cream sm:text-[2.125rem]">
                <Link
                  href={`/acervo/${feature.slug}`}
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                >
                  {feature.title}
                </Link>
              </h3>
              {feature.subtitle ? (
                <p className="mt-2 text-pretty text-[0.9375rem] leading-snug text-neabi-cream/75 sm:text-[1.0625rem]">
                  {feature.subtitle}
                </p>
              ) : null}
              {featureCredit ? (
                <p className="mt-3 text-[0.875rem] text-neabi-cream/60">{featureCredit}</p>
              ) : null}
              <span
                aria-hidden="true"
                className="mt-auto inline-flex items-center gap-2 pt-5 text-[0.875rem] font-semibold text-neabi-cream"
              >
                Conhecer a obra
                <ArrowRight className="size-4 text-neabi-amber transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
              </span>
            </div>
          </article>

          {others.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {others.map((book) => (
                <li key={book.id}>
                  <Link
                    href={`/acervo/${book.slug}`}
                    className="flex h-full items-center gap-4 border border-neabi-cream/15 p-3 transition-colors hover:border-neabi-cream/35"
                  >
                    <span className="w-12 shrink-0">
                      <BookCover
                        title={book.title}
                        coverImage={book.coverImage}
                        tone={categoryTone(book.categories[0]?.category.slug)}
                        sizes="48px"
                        theme="light"
                        decorative
                      />
                    </span>
                    <span className="line-clamp-2 font-display text-lg font-semibold leading-tight text-neabi-cream">
                      {book.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sobre
// ---------------------------------------------------------------------------

const PRINCIPLES = [
  {
    term: "Consulta presencial",
    detail:
      "Os exemplares ficam disponíveis para consulta e retirada no espaço do NEABI, mediante reserva.",
  },
  {
    term: "Catalogação aberta",
    detail:
      "Dados bibliográficos ainda não conferidos aparecem em branco — nunca preenchidos com informação estimada.",
  },
  {
    term: "Acervo digital com autorização",
    detail:
      "A consulta digital só é liberada para materiais com autorização expressa registrada pelo núcleo.",
  },
];

async function AboutSection() {
  const stats = await getPublicCatalogStats();

  const numbers = [
    { value: stats.books, label: stats.books === 1 ? "obra publicada" : "obras publicadas" },
    { value: stats.categories, label: stats.categories === 1 ? "eixo temático" : "eixos temáticos" },
    {
      value: stats.totalCopies,
      label: stats.totalCopies === 1 ? "exemplar físico" : "exemplares físicos",
    },
    {
      value: stats.availableCopies,
      label: stats.availableCopies === 1 ? "disponível agora" : "disponíveis agora",
    },
  ];

  return (
    <section
      aria-labelledby="sobre-titulo"
      className="section-y relative overflow-hidden border-t border-border bg-surface-muted"
    >
      <div
        aria-hidden="true"
        className="neabi-pattern-lines pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 text-ink-900 opacity-[0.04] [mask-image:linear-gradient(to_right,black,transparent)] lg:block"
      />
      <Container className="relative grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7 lg:pr-8">
          <Eyebrow>Sobre o NEABI</Eyebrow>
          <h2
            id="sobre-titulo"
            className="mt-4 max-w-2xl text-balance font-display text-display-md font-bold text-ink-900"
          >
            Memória, pesquisa e acesso ao conhecimento
          </h2>
          <div className="mt-7 max-w-2xl space-y-4 text-pretty text-lede text-ink-700">
            <p>
              O NEABI do CEFET/RJ, campus Nova Iguaçu, articula ensino, pesquisa e
              extensão em torno das relações étnico-raciais, da história e da
              cultura afro-brasileira e dos povos indígenas.
            </p>
            <p>
              Esta biblioteca organiza o acervo físico do núcleo e abre consulta
              presencial à comunidade acadêmica e à comunidade externa.
            </p>
          </div>

          <blockquote className="mt-9 max-w-xl border-l-4 border-neabi-red pl-5">
            <p className="text-balance font-display text-[1.625rem] font-semibold leading-tight text-ink-900 sm:text-[1.875rem]">
              Um acervo em catalogação permanente, construído coletivamente.
            </p>
          </blockquote>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="dark" size="lg">
              <Link href="/sobre">Sobre o NEABI</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contato">Falar com a equipe</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5 lg:pt-2">
          <div className="on-dark relative overflow-hidden bg-neabi-black p-7 text-neabi-cream sm:p-8">
            <div aria-hidden="true" className="neabi-rule absolute inset-x-0 top-0 h-1" />
            <p className="eyebrow text-neabi-amber">O acervo hoje</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7">
              {numbers.map((item) => (
                <div key={item.label} className="flex flex-col-reverse gap-1.5">
                  <dt className="text-[0.8125rem] leading-snug text-neabi-cream/65">
                    {item.label}
                  </dt>
                  <dd className="font-display text-[2.75rem] font-bold leading-none tabular-nums">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <dl className="border-t border-border-strong">
            {PRINCIPLES.map((item, index) => (
              <div
                key={item.term}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-b border-border-strong py-5"
              >
                <span aria-hidden="true" className="pt-1 font-sans text-[0.75rem] font-semibold tabular-nums text-neabi-red-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <dt className="font-display text-xl font-semibold text-ink-900">{item.term}</dt>
                  <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink-600">
                    {item.detail}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
