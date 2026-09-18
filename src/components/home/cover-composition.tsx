import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { categoryTone } from "@/config/catalog";
import { formatCredit } from "@/lib/credits";
import { cn } from "@/lib/utils";
import type { BookCardRecord } from "@/server/repositories/book-repository";

/**
 * Composição editorial do hero.
 *
 * Três obras reais do acervo, em alturas e tamanhos diferentes, sobre uma
 * moldura fina. Usa a fotografia quando ela existe e a ficha tipográfica com o
 * título real quando não — nunca uma capa inventada.
 *
 * As capas são decorativas (o conjunto é ilustração); o único alvo de foco é a
 * legenda, que leva à obra em primeiro plano.
 */

const SLOTS = [
  // Primeiro plano, ao centro.
  "left-[33%] top-[3%] w-[37%] z-30",
  // Esquerda, mais baixa.
  "left-[2%] top-[17%] w-[30%] z-20",
  // Direita, deslocada para cima.
  "left-[68%] top-[10%] w-[30%] z-20",
] as const;

export function CoverComposition({
  books,
  className,
}: {
  books: BookCardRecord[];
  className?: string;
}) {
  // A composição é a primeira imagem do site: nela cabem as obras que têm
  // fotografia. As demais continuam em destaque logo abaixo, no trilho de
  // cartões — a ficha do sistema é boa num cartão de catálogo e fraca como
  // ilustração de abertura. A ordem editorial dos destaques é preservada
  // dentro de cada grupo.
  const shown = [...books]
    .sort((a, b) => Number(Boolean(b.coverImage)) - Number(Boolean(a.coverImage)))
    .slice(0, SLOTS.length);
  if (shown.length === 0) return null;
  const front = shown[0];

  return (
    <figure className={cn("relative mx-auto w-full max-w-[36rem]", className)}>
      <div aria-hidden="true" className="relative aspect-[6/5] w-full">
        {/* Moldura e grafismo por trás das capas. */}
        <div className="absolute left-[10%] top-[9%] h-[74%] w-[80%] border border-neabi-cream/12" />
        <div className="neabi-pattern-diamonds absolute left-[58%] top-[58%] h-[30%] w-[34%] text-neabi-cream opacity-[0.06]" />
        <div className="absolute left-[29.5%] top-[3%] h-[34%] w-[3px] [background-image:linear-gradient(to_bottom,var(--neabi-red)_0_33.33%,var(--neabi-amber)_33.33%_66.66%,var(--neabi-green)_66.66%_100%)]" />

        {shown.map((book, index) => (
          <div
            key={book.id}
            className={cn(
              "absolute shadow-[0_32px_60px_-28px_rgb(0_0_0/0.95)] ring-1 ring-white/10 motion-safe:animate-fade-up",
              SLOTS[index],
            )}
            style={{ animationDelay: `${140 + index * 110}ms` }}
          >
            <BookCover
              title={book.title}
              coverImage={book.coverImage}
              coverAlt={book.coverAlt}
              tone={categoryTone(book.categories[0]?.category.slug)}
              categoryName={book.categories[0]?.category.name}
              credit={formatCredit(book.contributors)}
              priority={index === 0}
              sizes="(min-width: 1024px) 220px, 40vw"
              theme="light"
              decorative
            />
          </div>
        ))}
      </div>

      <figcaption className="relative -mt-[9%] ml-[33%] max-w-[62%]">
        <p className="eyebrow text-neabi-amber">Em destaque no acervo</p>
        <Link
          href={`/acervo/${front.slug}`}
          className="group mt-2 inline-flex items-start gap-2 font-display text-[1.375rem] font-semibold leading-tight text-neabi-cream"
        >
          <span className="link-underline line-clamp-2">{front.title}</span>
          <ArrowRight
            aria-hidden="true"
            className="mt-1.5 size-4 shrink-0 text-neabi-amber transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
          />
        </Link>
      </figcaption>
    </figure>
  );
}
