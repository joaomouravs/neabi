import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";

import { AvailabilityCard } from "@/components/books/availability-card";
import { BookCard } from "@/components/books/book-card";
import { BookCover, MissingCoverNote } from "@/components/books/book-cover";
import { formatCredit } from "@/components/books/book-card";
import {
  Container,
  MetadataList,
  NeabiRule,
  SectionHeading,
} from "@/components/layout/primitives";
import { Badge } from "@/components/ui/badge";
import {
  catalogingStatusLabels,
  contributorRoleLabels,
  materialTypeLabels,
} from "@/config/catalog";
import { siteConfig } from "@/config/site";
import { ContributorRole } from "@/generated/prisma/enums";
import { getActor } from "@/server/auth/session";
import {
  findBookBySlug,
  findRelatedBooks,
} from "@/server/repositories/book-repository";
import { computeAvailability } from "@/server/services/availability";
import { recordBookView } from "@/server/services/book-service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await findBookBySlug(slug);
  if (!book) return { title: "Obra não encontrada" };

  const credit = formatCredit(book.contributors);
  const description =
    book.description ??
    book.summary ??
    [book.subtitle, credit, book.publisher?.name].filter(Boolean).join(" · ") ??
    siteConfig.description;

  return {
    title: book.title,
    description: description || siteConfig.description,
    alternates: { canonical: `/acervo/${book.slug}` },
    openGraph: {
      type: "book",
      title: `${siteConfig.name} — ${book.title}`,
      description: description || siteConfig.description,
      url: `${siteConfig.url}/acervo/${book.slug}`,
    },
  };
}

export default async function BookPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [book, actor] = await Promise.all([findBookBySlug(slug), getActor()]);

  if (!book) notFound();

  const availability = computeAvailability(book.copies, book.assets);
  const credit = formatCredit(book.contributors);

  // Contabiliza o acesso sem bloquear a renderização da página.
  void trackView(book.id, actor?.id ?? null);

  const contributorsByRole = groupContributors(book.contributors);

  return (
    <>
      <Container className="pt-8">
        <Breadcrumbs
          categoryName={book.categories[0]?.category.name}
          categorySlug={book.categories[0]?.category.slug}
          title={book.title}
        />
      </Container>

      <Container className="pb-20 pt-8">
        {/*
          Ordem no mobile: capa → título → ficha → disponibilidade → descrição.
          No desktop, a disponibilidade vai para a terceira coluna. O card é
          renderizado UMA vez e reposicionado pela grade — duplicá-lo criaria
          IDs repetidos e conteúdo repetido para leitores de tela.
        */}
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)_320px] lg:gap-x-12 lg:gap-y-0">
          {/* Capa */}
          <div className="mx-auto w-full max-w-[260px] lg:col-start-1 lg:row-start-1 lg:mx-0">
            <BookCover
              title={book.title}
              coverImage={book.coverImage}
              coverAlt={book.coverAlt}
              priority
              sizes="(min-width: 1024px) 260px, 60vw"
            />
            {!book.coverImage ? (
              <div className="mt-3">
                <MissingCoverNote />
              </div>
            ) : null}
          </div>

          {/* Identificação e ficha bibliográfica */}
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="red">{materialTypeLabels[book.materialType]}</Badge>
              {book.categories.map(({ category }) => (
                <Link key={category.id} href={`/acervo?category=${category.slug}`}>
                  <Badge variant="outline">{category.name}</Badge>
                </Link>
              ))}
            </div>

            <h1 className="mt-4 text-balance font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[0.98] text-ink-900">
              {book.title}
            </h1>

            {book.subtitle ? (
              <p className="mt-3 text-pretty font-display text-[1.375rem] font-semibold leading-tight text-ink-600">
                {book.subtitle}
              </p>
            ) : null}

            {credit ? (
              <p className="mt-4 text-[1.0625rem] text-ink-700">{credit}</p>
            ) : null}

            <NeabiRule className="mt-7" />

            <section aria-labelledby="ficha-titulo" className="mt-10">
              <h2
                id="ficha-titulo"
                className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
              >
                Ficha bibliográfica
              </h2>
              <div className="mt-4">
                <MetadataList
                  items={[
                    ...contributorsByRole.map((group) => ({
                      label: contributorRoleLabels[group.role],
                      value: (
                        <span className="flex flex-wrap gap-x-1.5">
                          {group.names.map((person, index) => (
                            <span key={person.slug}>
                              <Link
                                href={`/acervo?author=${person.slug}`}
                                className="underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-neabi-red"
                              >
                                {person.name}
                              </Link>
                              {index < group.names.length - 1 ? ";" : ""}
                            </span>
                          ))}
                        </span>
                      ),
                    })),
                    { label: "Instituição", value: book.institution?.name },
                    { label: "Editora", value: book.publisher?.name },
                    { label: "Coleção", value: book.collection },
                    { label: "Edição", value: book.edition },
                    { label: "Ano", value: book.year },
                    { label: "Idioma", value: book.language },
                    { label: "Páginas", value: book.pages },
                    { label: "ISBN", value: book.isbn },
                    {
                      label: "Tipo de material",
                      value: materialTypeLabels[book.materialType],
                    },
                    {
                      label: "Assuntos",
                      value:
                        book.subjects.length > 0 ? (
                          <span className="flex flex-wrap gap-1.5">
                            {book.subjects.map(({ subject }) => (
                              <Link
                                key={subject.id}
                                href={`/acervo?subject=${subject.slug}`}
                              >
                                <Badge variant="neutral" size="sm">
                                  {subject.name}
                                </Badge>
                              </Link>
                            ))}
                          </span>
                        ) : null,
                    },
                    {
                      label: "Tags",
                      value:
                        book.tags.length > 0 ? (
                          <span className="flex flex-wrap gap-1.5">
                            {book.tags.map(({ tag }) => (
                              <Link key={tag.id} href={`/acervo?tag=${tag.slug}`}>
                                <Badge variant="neutral" size="sm">
                                  {tag.name}
                                </Badge>
                              </Link>
                            ))}
                          </span>
                        ) : null,
                    },
                  ]}
                />
              </div>

              {book.catalogingStatus === "NEEDS_REVIEW" ? (
                <p className="mt-6 border-l-2 border-neabi-amber bg-neabi-amber-050 px-4 py-3 text-[0.8125rem] leading-relaxed text-neabi-amber-900">
                  {catalogingStatusLabels.NEEDS_REVIEW}. Alguns campos ainda não
                  foram conferidos pela equipe do NEABI e por isso não aparecem
                  nesta ficha.
                </p>
              ) : null}
            </section>
          </div>

          {/* Disponibilidade */}
          <div className="lg:col-start-3 lg:row-start-1">
            <div className="lg:sticky lg:top-24">
              <AvailabilityCard
                slug={book.slug}
                availability={availability}
                copies={book.copies}
                isAuthenticated={Boolean(actor)}
              />
            </div>
          </div>

          {/* Descrição e notas */}
          <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:pb-4">
            {book.description || book.summary ? (
              <section aria-labelledby="sobre-obra" className="lg:mt-12">
                <h2
                  id="sobre-obra"
                  className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
                >
                  Sobre a obra
                </h2>
                <div className="mt-4 max-w-prose space-y-4 text-[1.0625rem] leading-relaxed text-ink-800">
                  {(book.description ?? book.summary ?? "")
                    .split(/\n{2,}/)
                    .map((paragraph, index) => (
                      <p key={index} className="text-pretty">
                        {paragraph}
                      </p>
                    ))}
                </div>
              </section>
            ) : null}

            {book.notes ? (
              <section
                aria-labelledby="notas-obra"
                className="mt-10 first:mt-0 lg:first:mt-12"
              >
                <h2
                  id="notas-obra"
                  className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
                >
                  Notas de catalogação
                </h2>
                <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
                  {book.notes}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </Container>

      <Suspense fallback={null}>
        <RelatedBooks
          bookId={book.id}
          categoryIds={book.categories.map(({ category }) => category.id)}
        />
      </Suspense>
    </>
  );
}

async function RelatedBooks({
  bookId,
  categoryIds,
}: {
  bookId: string;
  categoryIds: string[];
}) {
  const related = await findRelatedBooks(bookId, categoryIds, 4);
  if (related.length === 0) return null;

  return (
    <section className="border-t border-border py-16">
      <Container>
        <SectionHeading
          eyebrow="No mesmo eixo"
          title="Outras obras do acervo"
          level={2}
        />
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-11 sm:grid-cols-3 lg:grid-cols-4">
          {related.map((book) => (
            <li key={book.id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function Breadcrumbs({
  categoryName,
  categorySlug,
  title,
}: {
  categoryName?: string;
  categorySlug?: string;
  title: string;
}) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-500">
        <li>
          <Link href="/" className="hover:text-ink-900">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/acervo" className="hover:text-ink-900">
            Acervo
          </Link>
        </li>
        {categoryName && categorySlug ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/acervo?category=${categorySlug}`}
                className="hover:text-ink-900"
              >
                {categoryName}
              </Link>
            </li>
          </>
        ) : null}
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="line-clamp-1 text-ink-700">
          {title}
        </li>
      </ol>
    </nav>
  );
}

function groupContributors(
  contributors: {
    role: ContributorRole;
    person: { name: string; slug: string };
  }[],
): { role: ContributorRole; names: { name: string; slug: string }[] }[] {
  const order: ContributorRole[] = [
    ContributorRole.AUTHOR,
    ContributorRole.ORGANIZER,
    ContributorRole.EDITOR,
    ContributorRole.TRANSLATOR,
    ContributorRole.CONTRIBUTOR,
  ];

  return order
    .map((role) => ({
      role,
      names: contributors
        .filter((contributor) => contributor.role === role)
        .map((contributor) => contributor.person),
    }))
    .filter((group) => group.names.length > 0);
}

/**
 * Registra a visualização com um identificador de visitante derivado de
 * cabeçalhos — nunca do IP em texto claro (ver `recordBookView`).
 */
async function trackView(bookId: string, userId: string | null): Promise<void> {
  const headerList = await headers();
  const seed =
    userId ??
    [
      headerList.get("x-forwarded-for"),
      headerList.get("user-agent"),
    ]
      .filter(Boolean)
      .join("|");

  await recordBookView(bookId, { userId, visitorSeed: seed || null });
}
