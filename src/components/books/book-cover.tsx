import Image from "next/image";

import type { NeabiTone } from "@/config/catalog";
import { resolveAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

/**
 * Capa de uma obra.
 *
 * As imagens do acervo são **fotografias dos exemplares físicos**, muitas
 * tiradas sobre uma mesa e não digitalizações de capa. Por isso usamos
 * `object-fit: cover` com proporção fixa: a foto preenche o espaço sem
 * distorcer e sem que precisemos recompor nada.
 *
 * Quando não existe fotografia, mostramos uma ficha tipográfica com o título,
 * o eixo e o crédito reais da obra — uma composição da identidade NEABI, e não
 * uma imitação de capa editorial. Nunca uma capa fabricada, gerada por IA ou
 * de outra edição. Quando a foto for enviada pelo painel, ela assume o lugar
 * sem nenhuma mudança de código.
 */
export function BookCover({
  title,
  coverImage,
  coverAlt,
  priority = false,
  sizes = "(min-width: 1280px) 280px, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 96px",
  className,
  ratio = "aspect-[3/4]",
  tone = "red",
  categoryName,
  credit,
  decorative = false,
  theme = "dark",
}: {
  title: string;
  coverImage: string | null;
  coverAlt?: string | null;
  priority?: boolean;
  sizes?: string;
  className?: string;
  ratio?: string;
  tone?: NeabiTone;
  categoryName?: string | null;
  credit?: string | null;
  /** A capa acompanha um título já anunciado — o `alt` ficaria repetido. */
  decorative?: boolean;
  /**
   * Tom da ficha tipográfica. Use `light` sobre superfícies escuras (hero,
   * seções pretas ou verdes): ficha preta sobre fundo preto desaparece.
   */
  theme?: "dark" | "light";
}) {
  const source = resolveAssetUrl(coverImage);

  return (
    <div
      className={cn(
        "@container relative w-full overflow-hidden bg-neabi-cream-200",
        ratio,
        className,
      )}
    >
      {source ? (
        <Image
          src={source}
          alt={decorative ? "" : (coverAlt ?? `Capa do exemplar de "${title}"`)}
          fill
          sizes={sizes}
          // `priority` foi descontinuado no Next 16; carregamento antecipado
          // com prioridade alta é o equivalente recomendado.
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover"
        />
      ) : (
        <CoverFallback
          title={title}
          tone={tone}
          categoryName={categoryName}
          credit={credit}
          theme={theme}
        />
      )}
    </div>
  );
}

const TONE_PATTERN: Record<NeabiTone, string> = {
  red: "text-neabi-red",
  amber: "text-neabi-amber",
  green: "text-neabi-green",
};

const TONE_BAR: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};

/**
 * Ficha tipográfica.
 *
 * Decorativa para leitores de tela (`aria-hidden`): o título já é anunciado
 * pelo card. Os tamanhos usam unidades de contêiner (`cqw`), então a mesma
 * composição funciona numa miniatura de 64px e numa capa de 320px.
 */
function CoverFallback({
  title,
  tone,
  categoryName,
  credit,
  theme,
}: {
  title: string;
  tone: NeabiTone;
  categoryName?: string | null;
  credit?: string | null;
  theme: "dark" | "light";
}) {
  const light = theme === "light";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 flex flex-col",
        light ? "bg-neabi-cream text-ink-900" : "bg-neabi-black text-neabi-cream",
      )}
    >
      <div className={cn("neabi-pattern-rows h-[8%] w-full opacity-70", TONE_PATTERN[tone])} />
      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-[5cqw] p-[9cqw]">
        <p
          className={cn(
            "line-clamp-1 font-sans text-[max(0.4375rem,4.4cqw)] font-semibold uppercase tracking-[0.16em]",
            light ? "text-ink-600" : "text-neabi-cream/55",
          )}
        >
          {categoryName ?? "Acervo NEABI"}
        </p>
        <p
          className={cn(
            "line-clamp-5 text-balance font-display text-[max(0.625rem,11.5cqw)] font-semibold uppercase leading-[0.96] tracking-[0.005em]",
            light ? "text-ink-900" : "text-neabi-cream",
          )}
        >
          {title}
        </p>
        <div>
          {credit ? (
            <p
              className={cn(
                "line-clamp-2 font-sans text-[max(0.4375rem,4.6cqw)] leading-snug",
                light ? "text-ink-600" : "text-neabi-cream/60",
              )}
            >
              {credit}
            </p>
          ) : null}
          <div className={cn("mt-[5cqw] h-[max(3px,1.6cqw)] w-[30%]", TONE_BAR[tone])} />
        </div>
      </div>
    </div>
  );
}

/** Etiqueta discreta indicando que a obra ainda não tem fotografia de capa. */
export function MissingCoverNote() {
  return (
    <p className="text-[0.8125rem] leading-snug text-ink-500">
      Fotografia da capa ainda não cadastrada para este exemplar.
    </p>
  );
}
