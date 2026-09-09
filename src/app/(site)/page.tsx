import Link from "next/link";
import { Suspense } from "react";

import { BookCard } from "@/components/books/book-card";
import { HeroSearch } from "@/components/catalog/hero-search";
import {
  Container,
  NeabiRule,
  SectionHeading,
} from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { BookGridSkeleton, EmptyState } from "@/components/ui/feedback";
import { FEATURED_BOOKS_LIMIT } from "@/config/site";
import { findFeaturedBooks } from "@/server/repositories/book-repository";
import { listCategoriesWithCounts } from "@/server/repositories/taxonomy-repository";
import { prisma } from "@/lib/prisma";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<FeaturedFallback />}>
        <FeaturedCollection />
      </Suspense>
      <Suspense fallback={null}>
        <CategoryIndex />
      </Suspense>
      <AboutStrip />
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden bg-neabi-black">
      {/* Grafismo geométrico de baixíssimo contraste: presença cultural sem
          disputar espaço com o conteúdo, e sem reduzir a legibilidade. */}
      <div
        aria-hidden="true"
        className="neabi-pattern pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.055]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neabi-black to-transparent"
      />

      <Container className="relative py-20 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-neabi-amber">
            Núcleo de Estudos Afro-Brasileiros e Indígenas
          </p>

          <h1 className="mt-5 text-balance font-display text-[clamp(3rem,10vw,6.5rem)] font-bold leading-[0.92] text-neabi-cream">
            Biblioteca NEABI
          </h1>

          <NeabiRule className="mt-7 w-28" />

          <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-neabi-cream/75 sm:text-xl">
            Acervo de estudos afro-brasileiros e indígenas
          </p>

          <div className="mt-10 max-w-2xl">
            <HeroSearch />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild variant="onDark" size="lg">
              <Link href="/acervo">Explorar acervo</Link>
            </Button>
            <Button asChild variant="onDarkOutline" size="lg">
              <Link href="/sobre">Conhecer o NEABI</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Acervo em destaque
// ---------------------------------------------------------------------------

function FeaturedFallback() {
  return (
    <Container className="py-20">
      <BookGridSkeleton count={4} />
    </Container>
  );
}

async function FeaturedCollection() {
  const [books, total] = await Promise.all([
    findFeaturedBooks(FEATURED_BOOKS_LIMIT),
    prisma.book.count({ where: { status: "PUBLISHED" } }),
  ]);

  return (
    <section className="border-b border-border py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Acervo em destaque"
          title="Obras do acervo físico"
          description={
            total > 0
              ? `${total} ${total === 1 ? "obra catalogada" : "obras catalogadas"} para consulta presencial no espaço do NEABI.`
              : undefined
          }
          action={
            <Button asChild variant="outline">
              <Link href="/acervo">Ver acervo completo</Link>
            </Button>
          }
        />

        <div className="mt-12">
          {books.length === 0 ? (
            <EmptyState
              title="Nenhuma obra publicada ainda"
              description="Assim que a catalogação começar, as obras aparecerão aqui."
            />
          ) : (
            <ul className="grid grid-cols-2 gap-x-5 gap-y-11 sm:grid-cols-3 lg:grid-cols-4">
              {books.map((book, index) => (
                <li key={book.id}>
                  <BookCard book={book} priority={index < 4} />
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
// Categorias
// ---------------------------------------------------------------------------

async function CategoryIndex() {
  const categories = (await listCategoriesWithCounts()).filter(
    (category) => category.bookCount > 0,
  );

  if (categories.length === 0) return null;

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Navegar por tema"
          title="Eixos do acervo"
          description="O acervo se organiza em eixos que atravessam educação, história, direitos, memória e produção de pesquisa."
        />

        <ul className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/acervo?category=${category.slug}`}
                className="group flex h-full flex-col justify-between gap-6 bg-background p-6 transition-colors hover:bg-surface-muted"
              >
                <div>
                  <h3 className="font-display text-[1.375rem] font-semibold text-ink-900">
                    {category.name}
                  </h3>
                  {category.description ? (
                    <p className="mt-2 text-pretty text-[0.9375rem] leading-relaxed text-ink-600">
                      {category.description}
                    </p>
                  ) : null}
                </div>
                <p className="font-sans text-[0.8125rem] font-semibold text-ink-500 transition-colors group-hover:text-neabi-red-600">
                  {category.bookCount}{" "}
                  {category.bookCount === 1 ? "obra" : "obras"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Faixa institucional
// ---------------------------------------------------------------------------

function AboutStrip() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-surface-muted py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="neabi-pattern-rows pointer-events-none absolute inset-0 text-ink-900 opacity-[0.04]"
      />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Sobre"
              title="Memória, pesquisa e acesso ao conhecimento"
              description={
                <>
                  <p>
                    O NEABI do CEFET/RJ, campus Nova Iguaçu, articula ensino,
                    pesquisa e extensão em torno das relações étnico-raciais, da
                    história e da cultura afro-brasileira e dos povos indígenas.
                  </p>
                  <p className="mt-4">
                    Esta biblioteca organiza o acervo físico do núcleo e abre
                    consulta presencial à comunidade acadêmica e à comunidade
                    externa — um acervo em catalogação permanente, construído
                    coletivamente.
                  </p>
                </>
              }
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="dark">
                <Link href="/sobre">Sobre o NEABI</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contato">Falar com a equipe</Link>
              </Button>
            </div>
          </div>

          <dl className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-1">
            {[
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
                term: "Acervo digital",
                detail:
                  "A consulta digital só é liberada para materiais com autorização expressa registrada pelo núcleo.",
              },
            ].map((item) => (
              <div key={item.term} className="bg-background p-6">
                <dt className="font-display text-lg font-semibold text-ink-900">
                  {item.term}
                </dt>
                <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
