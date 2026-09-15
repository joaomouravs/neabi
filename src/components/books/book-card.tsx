import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { categoryTone, type NeabiTone } from "@/config/catalog";
import { formatCredit } from "@/lib/credits";
import type { BookCardRecord } from "@/server/repositories/book-repository";
import { cn } from "@/lib/utils";

export { formatCredit };

export type BookCardLayout = "responsive" | "vertical" | "horizontal";

const TONE_DOT: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};

/**
 * Cartão de uma obra do acervo.
 *
 * O cartão inteiro é clicável, mas com um único alvo acessível: o nome
 * anunciado é o título da obra, e o restante (capa, eixo, créditos) é contexto
 * visual. Títulos longos são truncados por linhas, nunca por largura — e a
 * página da obra mostra tudo por extenso.
 *
 * `responsive` é horizontal abaixo de 480px (capa pequena ao lado do texto,
 * legível e sem uma capa de 450px de altura por obra) e vertical acima disso.
 */
export function BookCard({
  book,
  priority = false,
  layout = "responsive",
  headingLevel = 3,
  className,
}: {
  book: BookCardRecord;
  priority?: boolean;
  layout?: BookCardLayout;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const credit = formatCredit(book.contributors);
  const category = book.categories[0]?.category;
  const tone = categoryTone(category?.slug);
  const availableCopies = book._count.copies;
  // Registros montados fora do repositório (testes) podem não trazer a lista.
  const totalCopies = book.copies?.length ?? availableCopies;
  const Heading = `h${headingLevel}` as const;

  return (
    // `h-full` faz o cartão ocupar a altura da linha da grade; com o `mt-auto`
    // do rodapé, disponibilidade e "Ler mais" ficam alinhados entre vizinhos.
    <article
      className={cn(
        "group relative flex h-full overflow-hidden border border-border bg-surface",
        "transition-[transform,box-shadow,border-color] duration-200 ease-editorial",
        // `hover:` só existe em dispositivos com ponteiro: no toque, nada
        // depende dele.
        "hover:-translate-y-[3px] hover:border-border-strong hover:shadow-lift motion-reduce:hover:translate-y-0",
        // O foco do link aparece no cartão inteiro, não só em volta do título.
        "has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-neabi-red-600",
        layout === "vertical" && "flex-col",
        layout === "horizontal" && "flex-row",
        layout === "responsive" && "flex-row min-[480px]:flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          layout === "vertical" && "w-full",
          layout === "horizontal" && "w-[5.5rem] self-start sm:w-24",
          layout === "responsive" && "w-[5.5rem] self-start min-[480px]:w-full",
        )}
      >
        <BookCover
          title={book.title}
          coverImage={book.coverImage}
          coverAlt={book.coverAlt}
          priority={priority}
          tone={tone}
          categoryName={category?.name}
          credit={credit}
          sizes={
            layout === "horizontal"
              ? "96px"
              : layout === "vertical"
                ? "(min-width: 1280px) 290px, (min-width: 768px) 30vw, 90vw"
                : "(min-width: 1280px) 290px, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 88px"
          }
          className="transition-transform duration-500 ease-editorial group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        {book.status !== "PUBLISHED" ? (
          <Badge variant="dark" size="sm" className="absolute left-2 top-2">
            {book.status === "DRAFT" ? "Rascunho" : "Arquivada"}
          </Badge>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          layout === "vertical" && "p-4 sm:p-5",
          layout === "horizontal" && "px-4 py-3.5",
          layout === "responsive" && "px-4 py-3.5 min-[480px]:p-4 lg:p-5",
        )}
      >
        {category ? (
          <p className="eyebrow flex min-w-0 items-center gap-2 tracking-[0.12em] text-ink-600">
            <span aria-hidden="true" className={cn("size-1.5 shrink-0", TONE_DOT[tone])} />
            <span className="truncate">{category.name}</span>
          </p>
        ) : null}

        <Heading
          className={cn(
            "text-pretty font-display font-semibold leading-[1.1] text-ink-900",
            category ? "mt-2" : "",
            layout === "horizontal"
              ? "text-[1.125rem]"
              : "text-[1.125rem] min-[480px]:text-[1.1875rem] lg:text-[1.25rem]",
          )}
        >
          <Link
            href={`/acervo/${book.slug}`}
            className="line-clamp-3 transition-colors after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-neabi-red-700"
          >
            {book.title}
          </Link>
        </Heading>

        {book.subtitle ? (
          <p className="mt-1 line-clamp-2 text-[0.875rem] leading-snug text-ink-600">
            {book.subtitle}
          </p>
        ) : null}

        {credit ? (
          <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-ink-500">
            <span>{credit}</span>
            {book.year ? <span> · {book.year}</span> : null}
          </p>
        ) : book.year ? (
          <p className="mt-2 text-[0.8125rem] text-ink-500">{book.year}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-4">
          <AvailabilityStatus
            available={availableCopies}
            total={totalCopies}
            digital={book.digitalAvailable}
          />
          <span
            aria-hidden="true"
            className={cn(
              "items-center gap-1 text-[0.8125rem] font-semibold text-ink-800 transition-colors group-hover:text-neabi-red-700",
              layout === "vertical" && "inline-flex",
              layout === "horizontal" && "hidden",
              layout === "responsive" && "hidden min-[480px]:inline-flex",
            )}
          >
            Ler mais
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Texto de disponibilidade física a partir da contagem de exemplares. */
export function availabilityText(available: number, total: number): string {
  if (available > 0) {
    return available === 1 ? "Exemplar disponível" : `${available} exemplares disponíveis`;
  }
  if (total > 0) return "Exemplar em uso";
  return "Sem exemplar físico";
}

function AvailabilityStatus({
  available,
  total,
  digital,
}: {
  available: number;
  total: number;
  digital: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium leading-tight">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            available > 0 ? "bg-neabi-green" : total > 0 ? "bg-neabi-amber" : "bg-ink-300",
          )}
        />
        <span className={available > 0 ? "text-neabi-green-700" : "text-ink-600"}>
          {availabilityText(available, total)}
        </span>
      </span>
      {digital ? (
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium leading-tight text-neabi-green-700">
          <span aria-hidden="true" className="size-2 shrink-0 border border-neabi-green" />
          <span>Consulta digital</span>
        </span>
      ) : null}
    </div>
  );
}
