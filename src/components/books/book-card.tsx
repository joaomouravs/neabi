import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { contributorRoleShortLabels } from "@/config/catalog";
import { ContributorRole } from "@/generated/prisma/enums";
import type { BookCardRecord } from "@/server/repositories/book-repository";
import { cn } from "@/lib/utils";

/**
 * Cartão de uma obra do acervo.
 *
 * O cartão inteiro é um link, mas com um único alvo acessível: o nome
 * anunciado é o título da obra, e o restante (capa, categoria, créditos) é
 * contexto visual. Títulos longos são truncados por linhas, não por largura,
 * então nenhum layout quebra.
 */
export function BookCard({
  book,
  priority = false,
  className,
}: {
  book: BookCardRecord;
  priority?: boolean;
  className?: string;
}) {
  const credit = formatCredit(book.contributors);
  const category = book.categories[0]?.category;
  const availableCopies = book._count.copies;

  return (
    // `h-full` faz o cartão ocupar a altura da linha da grade; combinado com o
    // `mt-auto` do rodapé abaixo, a disponibilidade e o "Ler mais" ficam
    // alinhados entre cartões vizinhos mesmo com títulos de tamanhos
    // diferentes.
    <article className={cn("group relative flex h-full flex-col", className)}>
      <div className="relative overflow-hidden">
        <BookCover
          title={book.title}
          coverImage={book.coverImage}
          coverAlt={book.coverAlt}
          priority={priority}
          className="transition-transform duration-300 ease-out group-hover:scale-[1.025] motion-reduce:transform-none"
        />
        {book.status !== "PUBLISHED" ? (
          <Badge variant="dark" className="absolute left-2 top-2">
            {book.status === "DRAFT" ? "Rascunho" : "Arquivada"}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col">
        {category ? (
          <p className="mb-1.5 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-neabi-red-600">
            {category.name}
          </p>
        ) : null}

        <h3 className="text-pretty font-display text-[1.1875rem] font-semibold leading-[1.15] text-ink-900">
          <Link
            href={`/acervo/${book.slug}`}
            className="line-clamp-3 outline-offset-4 after:absolute after:inset-0 after:content-['']"
          >
            {book.title}
          </Link>
        </h3>

        {book.subtitle ? (
          <p className="mt-1 line-clamp-2 text-[0.875rem] leading-snug text-ink-600">
            {book.subtitle}
          </p>
        ) : null}

        {credit ? (
          <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-ink-500">
            {credit}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4">
          <AvailabilityDot available={availableCopies > 0} />
          {book.digitalAvailable ? (
            <span className="text-[0.75rem] font-medium text-neabi-green-700">
              Consulta digital
            </span>
          ) : null}
          {book.year ? (
            <span className="text-[0.75rem] text-ink-400">{book.year}</span>
          ) : null}
        </div>

        <p
          aria-hidden="true"
          className="mt-3 font-sans text-[0.8125rem] font-semibold text-ink-800 underline decoration-neabi-red decoration-2 underline-offset-4 transition-colors group-hover:text-neabi-red-600"
        >
          Ler mais
        </p>
      </div>
    </article>
  );
}

function AvailabilityDot({ available }: { available: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          available ? "bg-neabi-green" : "bg-ink-300",
        )}
      />
      <span className={available ? "text-neabi-green-700" : "text-ink-500"}>
        {available ? "Exemplar disponível" : "Exemplar em uso"}
      </span>
    </span>
  );
}

/**
 * Créditos resumidos para o cartão.
 *
 * Mostra até dois nomes do papel mais relevante presente (autoria antes de
 * organização) e indica o papel quando não é autoria — "Iolanda de Oliveira
 * (org.)" comunica algo diferente de uma autoria.
 */
export function formatCredit(
  contributors: readonly {
    role: ContributorRole;
    person: { name: string };
  }[],
): string | null {
  if (contributors.length === 0) return null;

  const priority: ContributorRole[] = [
    ContributorRole.AUTHOR,
    ContributorRole.ORGANIZER,
    ContributorRole.EDITOR,
    ContributorRole.CONTRIBUTOR,
    ContributorRole.TRANSLATOR,
  ];

  const role = priority.find((candidate) =>
    contributors.some((contributor) => contributor.role === candidate),
  );
  if (!role) return null;

  const names = contributors
    .filter((contributor) => contributor.role === role)
    .map((contributor) => contributor.person.name);

  const shown = names.slice(0, 2).join("; ");
  const suffix = names.length > 2 ? ` e mais ${names.length - 2}` : "";
  const roleSuffix =
    role === ContributorRole.AUTHOR
      ? ""
      : ` (${contributorRoleShortLabels[role].toLowerCase()})`;

  return `${shown}${suffix}${roleSuffix}`;
}
