import { Quote } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AvailabilityCard } from "@/components/books/availability-card";
import { CopyReference, ShareButton } from "@/components/books/book-actions";
import { BookCover, MissingCoverNote } from "@/components/books/book-cover";
import { BookGrid } from "@/components/books/book-grid";
import { StickyReserveBar } from "@/components/books/sticky-reserve-bar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumbs,
  Container,
  MetadataList,
  NeabiRule,
  SectionHeading,
} from "@/components/layout/primitives";
import {
  catalogingStatusLabels,
  categoryTone,
  contributorRoleLabels,
  materialTypeLabels,
  type NeabiTone,
} from "@/config/catalog";
import { siteConfig } from "@/config/site";
import { ContributorRole } from "@/generated/prisma/enums";
import { formatCredit } from "@/lib/credits";
import { buildReference } from "@/lib/reference";
import { cn } from "@/lib/utils";
import { getActor } from "@/server/auth/session";
import {
  findBookBySlug,
  findRelatedBooks,
} from "@/server/repositories/book-repository";
import {
  computeAvailability,
  physicalAvailabilityLabel,
} from "@/server/services/availability";
import { recordBookView } from "@/server/services/book-service";

type Params = Promise<{ slug: string }>;

const TONE_DOT: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};

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
    [book.subtitle, credit, book.publisher?.name].filter(Boolean).join(" · ");

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
  const primaryCategory = book.categories[0]?.category;
  const tone = categoryTone(primaryCategory?.slug);
  const contributorsByRole = groupContributors(book.contributors);
  const reference = buildReference(book);

  // Contabiliza o acesso sem bloquear a renderização da página.
  void trackView(book.id, actor?.id ?? null);

  const reserveHref = actor
    ? `/acervo/${book.slug}/reservar`
    : `/login?callbackUrl=${encodeURIComponent(`/acervo/${book.slug}/reservar`)}`;

  // O tipo de material já está no selo acima do título.
  const quickFacts = [
    book.year ? String(book.year) : null,
    book.publisher?.name ?? book.institution?.name ?? null,
    book.pages ? `${book.pages} páginas` : null,
  ].filter((fact): fact is string => Boolean(fact));

  const description = book.description ?? book.summary;
  const hasSubjects = book.subjects.length > 0 || book.tags.length > 0;

  return (
    <>
      <div className="border-b border-border bg-surface-muted">
        <Container className="py-3.5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Início" },
              { href: "/acervo", label: "Acervo" },
              ...(primaryCategory
                ? [
                    {
                      href: `/acervo?category=${primaryCategory.slug}`,
                      label: primaryCategory.name,
                    },
                  ]
                : []),
              { label: book.title },
            ]}
          />
        </Container>
      </div>

      <Container className="pb-16 pt-8 sm:pt-10 lg:pb-24 lg:pt-14">
        {/*
          Uma única marcação, reposicionada por áreas de grade:
          - celular: capa → título/autoria/status → reserva → ficha → descrição;
          - desktop médio: capa e reserva à esquerda, conteúdo à direita;
          - desktop largo: capa | conteúdo | reserva.
          O cartão de disponibilidade é renderizado uma vez só — duplicá-lo por
          tamanho de tela repetiria IDs e conteúdo para leitores de tela.
        */}
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] gap-x-12",
            "[grid-template-areas:'cover'_'head'_'avail'_'info'_'about'_'subjects']",
            "lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr]",
            "lg:[grid-template-areas:'cover_head'_'avail_about'_'avail_info'_'avail_subjects']",
            "xl:grid-cols-[16.5rem_minmax(0,1fr)_20rem] xl:gap-x-14",
            "xl:[grid-template-areas:'cover_head_avail'_'cover_about_avail'_'cover_info_avail'_'cover_subjects_avail']",
          )}
        >
          {/* Capa */}
          <div className="pb-8 [grid-area:cover] lg:pb-10">
            <div className="xl:sticky xl:top-[calc(var(--header-height-compact)+1.5rem)]">
              <div className="mx-auto w-full max-w-[13.5rem] sm:max-w-[15rem] lg:max-w-none">
                <BookCover
                  title={book.title}
                  coverImage={book.coverImage}
                  coverAlt={book.coverAlt}
                  tone={tone}
                  categoryName={primaryCategory?.name}
                  credit={credit}
                  priority
                  // Aqui a capa é o assunto da página, não um elemento de
                  // grade: mostramos a fotografia inteira, sem recorte. As
                  // fotos têm proporções diferentes entre si, então sobra
                  // respiro em volta — preferível a cortar a arte impressa.
                  fit={book.coverImage ? "contain" : "cover"}
                  sizes="(min-width: 1280px) 264px, (min-width: 1024px) 240px, 240px"
                  className={cn("shadow-lift", book.coverImage && "border border-border")}
                />
              </div>
              {!book.coverImage ? (
                <div className="mt-3 text-center lg:text-left">
                  <MissingCoverNote />
                </div>
              ) : null}
            </div>
          </div>

          {/* Identificação */}
          <header className="min-w-0 pb-8 [grid-area:head] lg:pb-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow inline-flex min-h-8 items-center border border-ink-900/20 px-2.5 tracking-[0.1em] text-ink-700">
                {materialTypeLabels[book.materialType]}
              </span>
              {book.categories.map(({ category }, index) => (
                <Link
                  key={category.id}
                  href={`/acervo?category=${category.slug}`}
                  // No celular, só o eixo principal: os demais aparecem em
                  // "Assuntos" e não empurram o título para baixo.
                  className={cn(
                    "eyebrow min-h-8 items-center gap-2 bg-neabi-cream-200/80 px-2.5 tracking-[0.1em] text-ink-700 transition-colors hover:bg-neabi-cream-300 hover:text-ink-900",
                    index === 0 ? "inline-flex" : "hidden sm:inline-flex",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5", TONE_DOT[categoryTone(category.slug)])}
                  />
                  {category.name}
                </Link>
              ))}
            </div>

            <h1 className="mt-5 text-balance font-display text-display-md font-bold text-ink-900">
              {book.title}
            </h1>

            {book.subtitle ? (
              <p className="mt-3 text-pretty font-display text-[clamp(1.25rem,2.2vw,1.625rem)] font-semibold leading-tight text-ink-600">
                {book.subtitle}
              </p>
            ) : null}

            {contributorsByRole.length > 0 ? (
              <div className="mt-5 flex flex-col gap-1.5 text-[1rem] leading-snug text-ink-700 sm:text-[1.0625rem]">
                {contributorsByRole.map((group) => (
                  <p key={group.role}>
                    <span className="text-ink-500">{contributorRoleLabels[group.role]}: </span>
                    {group.names.map((person, index) => (
                      <span key={person.slug}>
                        <Link
                          href={`/acervo?author=${person.slug}`}
                          className="font-medium text-ink-900 underline decoration-ink-300 decoration-1 underline-offset-4 transition-colors hover:decoration-neabi-red-600"
                        >
                          {person.name}
                        </Link>
                        {index < group.names.length - 1 ? "; " : ""}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            ) : null}

            <NeabiRule className="mt-7" />

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[0.9375rem]">
              <span className="inline-flex items-center gap-2 font-medium">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    availability.physicalAvailable
                      ? "bg-neabi-green"
                      : availability.hasPhysicalCopies
                        ? "bg-neabi-amber"
                        : "bg-ink-300",
                  )}
                />
                <span
                  className={
                    availability.physicalAvailable ? "text-neabi-green-700" : "text-ink-700"
                  }
                >
                  {physicalAvailabilityLabel(availability)}
                </span>
              </span>
              {quickFacts.length > 0 ? (
                <span className="text-ink-600">{quickFacts.join(" · ")}</span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <ShareButton title={book.title} path={`/acervo/${book.slug}`} />
              <Button asChild variant="outline" size="sm">
                <Link href="#referencia">
                  <Quote aria-hidden="true" />
                  Citar esta obra
                </Link>
              </Button>
            </div>
          </header>

          {/* Disponibilidade */}
          <div className="pb-10 [grid-area:avail] lg:pb-0">
            <div className="lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)]">
              <AvailabilityCard
                slug={book.slug}
                availability={availability}
                copies={book.copies}
                isAuthenticated={Boolean(actor)}
                reserveCtaId="cta-reserva"
              />
            </div>
          </div>

          {/* Sobre esta obra */}
          {description || book.notes ? (
            <section aria-labelledby="sobre-obra" className="min-w-0 pb-10 [grid-area:about]">
              <SectionLabel id="sobre-obra">Sobre esta obra</SectionLabel>
              {description ? (
                <div className="mt-4 max-w-prose space-y-4 text-[1.0625rem] leading-relaxed text-ink-800">
                  {description.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index} className="text-pretty">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
              {book.notes ? (
                <div className="mt-6 max-w-prose border-l-2 border-border-strong pl-4">
                  <p className="eyebrow tracking-[0.12em] text-ink-500">Notas de catalogação</p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
                    {book.notes}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Informações bibliográficas */}
          <section aria-labelledby="ficha-titulo" className="min-w-0 pb-10 [grid-area:info]">
            <SectionLabel id="ficha-titulo">Informações bibliográficas</SectionLabel>
            <div className="mt-4 border-t border-border pt-4">
              <MetadataList
                items={[
                  ...contributorsByRole.map((group) => ({
                    label: contributorRoleLabels[group.role],
                    value: group.names.map((person) => person.name).join("; "),
                  })),
                  { label: "Instituição", value: book.institution?.name },
                  { label: "Editora", value: book.publisher?.name },
                  { label: "Coleção", value: book.collection },
                  { label: "Edição", value: book.edition },
                  { label: "Ano", value: book.year },
                  { label: "Idioma", value: book.language },
                  { label: "Páginas", value: book.pages },
                  { label: "ISBN", value: book.isbn },
                  { label: "Tipo de material", value: materialTypeLabels[book.materialType] },
                ]}
              />
            </div>

            {book.catalogingStatus === "NEEDS_REVIEW" ? (
              <p className="mt-6 max-w-prose border-l-2 border-neabi-amber bg-neabi-amber-050 px-4 py-3 text-[0.8125rem] leading-relaxed text-neabi-amber-900">
                {catalogingStatusLabels.NEEDS_REVIEW}. Alguns campos ainda não
                foram conferidos pela equipe do NEABI e por isso não aparecem
                nesta ficha.
              </p>
            ) : null}

            <div id="referencia" className="mt-6 scroll-mt-28">
              <CopyReference reference={reference} />
            </div>
          </section>

          {/* Assuntos */}
          {hasSubjects || book.categories.length > 0 ? (
            <section aria-labelledby="assuntos-titulo" className="min-w-0 pb-4 [grid-area:subjects]">
              <SectionLabel id="assuntos-titulo">Assuntos</SectionLabel>
              <ul className="mt-4 flex flex-wrap gap-2">
                {book.categories.map(({ category }) => (
                  <li key={`c-${category.id}`}>
                    <SubjectLink href={`/acervo?category=${category.slug}`}>{category.name}</SubjectLink>
                  </li>
                ))}
                {book.subjects.map(({ subject }) => (
                  <li key={`s-${subject.id}`}>
                    <SubjectLink href={`/acervo?subject=${subject.slug}`}>{subject.name}</SubjectLink>
                  </li>
                ))}
                {book.tags.map(({ tag }) => (
                  <li key={`t-${tag.id}`}>
                    <SubjectLink href={`/acervo?tag=${tag.slug}`}>{tag.name}</SubjectLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </Container>

      <Suspense fallback={null}>
        <RelatedBooks
          bookId={book.id}
          categoryIds={book.categories.map(({ category }) => category.id)}
        />
      </Suspense>

      {availability.physicalAvailable ? (
        <StickyReserveBar
          href={reserveHref}
          title={book.title}
          statusLabel={physicalAvailabilityLabel(availability)}
          targetId="cta-reserva"
          stopId="relacionadas"
        />
      ) : null}
    </>
  );
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-[1.625rem] font-bold leading-tight text-ink-900">
      {children}
    </h2>
  );
}

function SubjectLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center border border-ink-900/15 bg-surface px-3.5 text-[0.875rem] text-ink-800 transition-colors hover:border-ink-900 hover:text-ink-900"
    >
      {children}
    </Link>
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
    <section
      id="relacionadas"
      aria-labelledby="relacionadas-titulo"
      className="section-y border-t border-border bg-surface-muted"
    >
      <Container>
        <SectionHeading
          id="relacionadas-titulo"
          eyebrow="No mesmo eixo"
          title="Você também pode se interessar"
          action={
            <Link
              href="/acervo"
              className="link-underline text-[0.9375rem] font-semibold text-ink-900"
            >
              Ver acervo completo
            </Link>
          }
        />
        <div className="mt-10">
          <BookGrid books={related} />
        </div>
      </Container>
    </section>
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
    [headerList.get("x-forwarded-for"), headerList.get("user-agent")]
      .filter(Boolean)
      .join("|");

  await recordBookView(bookId, { userId, visitorSeed: seed || null });
}
