import { BookCoverPlaceholder } from "@/components/books/book-cover-placeholder";
import { CoverImage } from "@/components/books/cover-image";
import type { NeabiTone } from "@/config/catalog";
import { resolveAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

/**
 * Capa de uma obra.
 *
 * As imagens do acervo são **fotografias dos exemplares físicos**, muitas
 * tiradas sobre uma mesa e não digitalizações de capa. Elas têm proporções
 * diferentes entre si, então a capa é sempre enquadrada, nunca esticada:
 *
 *  - `cover` (padrão) preenche uma área de proporção fixa. É o que mantém o
 *    grid do acervo regular, com todos os cartões da mesma altura;
 *  - `contain` mostra a fotografia inteira dentro da área, com respiro em
 *    volta. É o enquadramento da página da obra, onde a capa é o assunto.
 *
 * Em nenhum dos dois a imagem é distorcida.
 *
 * Sem fotografia — ou se o arquivo indicado falhar ao carregar — entra a ficha
 * do sistema (`BookCoverPlaceholder`), que é assumidamente uma ficha e não uma
 * capa. Nunca uma capa fabricada, gerada por IA ou de outra edição. Quando a
 * foto for enviada pelo painel, ela assume o lugar sem mudança de código.
 */
export function BookCover({
  title,
  coverImage,
  coverAlt,
  priority = false,
  sizes = "(min-width: 1280px) 280px, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 96px",
  className,
  ratio = "aspect-3/4",
  fit = "cover",
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
  /** `contain` mostra a capa inteira; `cover` padroniza o enquadramento. */
  fit?: "cover" | "contain";
  tone?: NeabiTone;
  categoryName?: string | null;
  credit?: string | null;
  /** A capa acompanha um título já anunciado — o `alt` ficaria repetido. */
  decorative?: boolean;
  /**
   * Tom da ficha do sistema. Use `light` sobre superfícies escuras (hero,
   * seções pretas ou verdes): ficha preta sobre fundo preto desaparece.
   */
  theme?: "dark" | "light";
}) {
  const source = resolveAssetUrl(coverImage);

  const placeholder = (
    <BookCoverPlaceholder
      title={title}
      tone={tone}
      categoryName={categoryName}
      credit={credit}
      theme={theme}
    />
  );

  return (
    <div
      className={cn(
        "@container relative w-full overflow-hidden",
        // Com `contain` a moldura aparece em volta da foto: um creme mais
        // claro, que não briga com a arte da capa.
        fit === "contain" ? "bg-neabi-cream-100" : "bg-neabi-cream-200",
        ratio,
        className,
      )}
    >
      {source ? (
        <CoverImage
          src={source}
          alt={decorative ? "" : (coverAlt ?? `Capa do livro ${title}`)}
          sizes={sizes}
          priority={priority}
          fit={fit}
          fallback={placeholder}
        />
      ) : (
        placeholder
      )}
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
