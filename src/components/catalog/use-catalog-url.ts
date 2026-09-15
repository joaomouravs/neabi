"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/** Parâmetros que representam filtro — `q`, `sort` e `page` não contam. */
export const FILTER_KEYS = [
  "category",
  "subject",
  "author",
  "tag",
  "type",
  "availability",
  "yearFrom",
  "yearTo",
] as const;

/**
 * Manipulação dos filtros do acervo pela URL.
 *
 * A URL é o estado: `/acervo?q=educacao&category=historia&sort=titulo-asc` é
 * compartilhável, indexável e sobrevive a um recarregamento. Nenhum filtro vive
 * apenas em memória do componente.
 */
export function useCatalogUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /** Monta a URL resultante da alteração de alguns parâmetros. */
  const buildUrl = useCallback(
    (changes: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      // Qualquer mudança de filtro recomeça a paginação: manter a página 7 ao
      // trocar de categoria quase sempre leva a um resultado vazio.
      if (!("page" in changes)) params.delete("page");

      const query = params.toString();
      return query.length > 0 ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const apply = useCallback(
    (changes: Record<string, string | number | null | undefined>) => {
      startTransition(() => {
        router.push(buildUrl(changes), { scroll: false });
      });
    },
    [buildUrl, router],
  );

  /** Remove filtros e busca, preservando só a ordenação escolhida. */
  const clearAll = useCallback(() => {
    const sort = searchParams.get("sort");
    startTransition(() => {
      router.push(sort ? `${pathname}?sort=${sort}` : pathname, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  const current = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  const activeCount = FILTER_KEYS.filter((key) => searchParams.has(key)).length;

  return { buildUrl, apply, clearAll, current, searchParams, isPending, activeCount };
}
