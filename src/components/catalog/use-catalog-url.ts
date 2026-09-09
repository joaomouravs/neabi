"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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
      router.push(buildUrl(changes), { scroll: false });
    },
    [buildUrl, router],
  );

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const current = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  return { buildUrl, apply, clearAll, current, searchParams };
}
