/**
 * Normalização de texto para busca e slugs.
 *
 * A busca precisa ignorar diferenças de acentuação ("etnico" encontra "étnico").
 * Em vez de depender da extensão `unaccent` do PostgreSQL — que nem todo
 * ambiente gerenciado disponibiliza —, normalizamos no momento da escrita e
 * guardamos o resultado em `Book.searchText`. A consulta normaliza o termo da
 * mesma forma, tornando a busca determinística e portável.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;
const CURLY_QUOTES = /[‘’“”]/g;

/** Minúsculas, sem diacríticos, espaços colapsados. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(CURLY_QUOTES, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Slug estável em ASCII, adequado para URLs públicas. */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Divide a expressão de busca em termos normalizados.
 * Termos entre aspas são preservados como uma unidade.
 */
export function tokenizeQuery(query: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(query)) !== null) {
    const raw = match[1] ?? match[2] ?? "";
    const normalized = normalizeText(raw);
    if (normalized.length > 0) tokens.push(normalized);
  }
  return tokens.slice(0, 8);
}

/** Escapa `%` e `_` para uso seguro em cláusulas LIKE/ILIKE. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
