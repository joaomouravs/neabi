import Image from "next/image";

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
 * Quando não existe fotografia, mostramos um cartão tipográfico com o título
 * real da obra. Nunca uma capa fabricada, gerada por IA ou de outra edição.
 */
export function BookCover({
  title,
  coverImage,
  coverAlt,
  priority = false,
  sizes = "(min-width: 1024px) 260px, (min-width: 640px) 33vw, 45vw",
  className,
  ratio = "aspect-[3/4]",
}: {
  title: string;
  coverImage: string | null;
  coverAlt?: string | null;
  priority?: boolean;
  sizes?: string;
  className?: string;
  ratio?: string;
}) {
  const source = resolveAssetUrl(coverImage);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-neabi-cream-200",
        ratio,
        className,
      )}
    >
      {source ? (
        <Image
          src={source}
          alt={coverAlt ?? `Capa do exemplar de "${title}"`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <CoverFallback title={title} />
      )}
    </div>
  );
}

/**
 * Fallback tipográfico.
 *
 * Decorativo para leitores de tela (`aria-hidden`): o título já é anunciado
 * pelo card. Repeti-lo aqui só criaria ruído.
 */
function CoverFallback({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-between bg-neabi-black p-4"
    >
      <div className="neabi-pattern-rows h-3 w-full text-neabi-cream opacity-[0.14]" />
      <p className="line-clamp-3 text-balance font-display text-[1.0625rem] font-semibold uppercase leading-tight tracking-[0.01em] text-neabi-cream/90 sm:text-xl">
        {title}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-6 bg-neabi-red" />
        <span className="h-1 w-6 bg-neabi-amber" />
        <span className="h-1 w-6 bg-neabi-green" />
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
