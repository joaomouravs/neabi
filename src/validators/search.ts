import { z } from "zod";

import { DEFAULT_SORT, SORT_OPTIONS } from "@/config/catalog";
import { CATALOG_PAGE_SIZE } from "@/config/site";
import { MaterialType } from "@/generated/prisma/enums";

const sortValues = SORT_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

/**
 * Parâmetros de busca do acervo, lidos diretamente da URL.
 *
 * Toda entrada é tolerante a lixo: um parâmetro inválido cai no padrão em vez
 * de derrubar a página. `catch` faz esse papel de forma explícita.
 */
export const catalogSearchParamsSchema = z.object({
  q: z.string().trim().max(160).catch("").default(""),
  category: z.string().trim().max(120).optional().catch(undefined),
  subject: z.string().trim().max(120).optional().catch(undefined),
  author: z.string().trim().max(120).optional().catch(undefined),
  tag: z.string().trim().max(120).optional().catch(undefined),
  type: z.enum(MaterialType).optional().catch(undefined),
  yearFrom: z.coerce.number().int().min(1400).max(2200).optional().catch(undefined),
  yearTo: z.coerce.number().int().min(1400).max(2200).optional().catch(undefined),
  availability: z.enum(["fisico", "digital"]).optional().catch(undefined),
  sort: z.enum(sortValues).catch(DEFAULT_SORT).default(DEFAULT_SORT),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(48)
    .catch(CATALOG_PAGE_SIZE)
    .default(CATALOG_PAGE_SIZE),
});

export type CatalogSearchParams = z.infer<typeof catalogSearchParamsSchema>;

/**
 * Converte `searchParams` do Next (valores podem ser arrays) em objeto simples,
 * mantendo apenas o primeiro valor de cada chave.
 */
export function flattenSearchParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    result[key] = Array.isArray(value) ? (value[0] ?? "") : value;
  }
  return result;
}

export function parseCatalogSearchParams(
  params: Record<string, string | string[] | undefined>,
): CatalogSearchParams {
  return catalogSearchParamsSchema.parse(flattenSearchParams(params));
}

/** Serializa filtros de volta para uma query string canônica. */
export function buildCatalogQuery(
  params: Partial<CatalogSearchParams>,
): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.subject) search.set("subject", params.subject);
  if (params.author) search.set("author", params.author);
  if (params.tag) search.set("tag", params.tag);
  if (params.type) search.set("type", params.type);
  if (params.yearFrom) search.set("yearFrom", String(params.yearFrom));
  if (params.yearTo) search.set("yearTo", String(params.yearTo));
  if (params.availability) search.set("availability", params.availability);
  if (params.sort && params.sort !== DEFAULT_SORT) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
}
