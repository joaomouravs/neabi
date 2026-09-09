import { normalizeText } from "@/lib/text";

/**
 * Composição do índice de busca de uma obra.
 *
 * Guardamos em `Book.searchText` uma versão normalizada (minúsculas, sem
 * acentos) de tudo que a busca precisa alcançar: título, subtítulo, pessoas,
 * editora, instituição, categorias, assuntos, tags, coleção, descrição, ano,
 * tipo de material e ISBN.
 *
 * Isso torna a busca:
 *  - tolerante a acentuação, sem depender da extensão `unaccent`;
 *  - determinística, porque a mesma normalização é aplicada ao termo digitado;
 *  - barata, porque é uma única coluna indexável em vez de vários JOINs.
 */
export interface SearchTextParts {
  title: string;
  subtitle?: string | null;
  collection?: string | null;
  description?: string | null;
  summary?: string | null;
  isbn?: string | null;
  year?: number | null;
  edition?: string | null;
  publisher?: string | null;
  institution?: string | null;
  contributors?: readonly string[];
  categories?: readonly string[];
  subjects?: readonly string[];
  tags?: readonly string[];
  materialType?: string | null;
}

export function composeSearchText(parts: SearchTextParts): string {
  const fragments: (string | null | undefined)[] = [
    parts.title,
    parts.subtitle,
    parts.collection,
    parts.publisher,
    parts.institution,
    parts.edition,
    parts.description,
    parts.summary,
    parts.materialType,
    parts.year != null ? String(parts.year) : null,
    // O ISBN entra também sem separadores para que "978-85..." e "97885..."
    // encontrem o mesmo registro.
    parts.isbn,
    parts.isbn ? parts.isbn.replace(/[\s-]/g, "") : null,
    ...(parts.contributors ?? []),
    ...(parts.categories ?? []),
    ...(parts.subjects ?? []),
    ...(parts.tags ?? []),
  ];

  const normalized = fragments
    .filter((fragment): fragment is string => Boolean(fragment))
    .map((fragment) => normalizeText(fragment))
    .filter((fragment) => fragment.length > 0);

  // Remove repetições preservando a ordem — o índice não ganha nada com o
  // mesmo termo dez vezes.
  return Array.from(new Set(normalized.join(" ").split(" "))).join(" ");
}
