"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { SORT_OPTIONS } from "@/config/catalog";
import { cn } from "@/lib/utils";

import { useCatalogUrl } from "./use-catalog-url";

/**
 * Controles do acervo: busca, pílulas de categoria e ordenação.
 *
 * Todos são links ou formulários reais — funcionam com o JavaScript ainda
 * carregando e são navegáveis por teclado sem armadilhas de foco.
 */

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

export function CatalogSearchInput({ initialValue }: { initialValue: string }) {
  const { apply } = useCatalogUrl();
  const [value, setValue] = useState(initialValue);

  /**
   * Sincroniza o campo quando a navegação vem de fora (botão voltar, link).
   * Ajustar o estado durante a renderização é o padrão recomendado para isso —
   * um efeito causaria uma renderização extra em cascata.
   */
  const [lastFromUrl, setLastFromUrl] = useState(initialValue);
  if (initialValue !== lastFromUrl) {
    setLastFromUrl(initialValue);
    setValue(initialValue);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ q: value.trim() || null });
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label htmlFor="busca-acervo" className="sr-only">
        Buscar no acervo por título, autoria, assunto, editora ou ISBN
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="busca-acervo"
            name="q"
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Buscar livros, autores ou temas"
            autoComplete="off"
            className="min-h-12 w-full border border-ink-900/20 bg-white px-3.5 pr-10 font-sans text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none"
          />
          {value.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                apply({ q: null });
              }}
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-ink-500 hover:text-ink-900"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">Limpar busca</span>
            </button>
          ) : null}
        </div>
        <Button type="submit" size="md" className="px-6">
          Buscar
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Pílulas de categoria
// ---------------------------------------------------------------------------

export interface QuickFilter {
  slug: string;
  name: string;
  bookCount: number;
}

export function CategoryPills({
  categories,
  active,
}: {
  categories: QuickFilter[];
  active?: string;
}) {
  const { buildUrl } = useCatalogUrl();

  return (
    <nav aria-label="Filtrar por categoria">
      <ul className="flex flex-wrap gap-2">
        <li>
          <PillLink href={buildUrl({ category: null })} active={!active}>
            Todos
          </PillLink>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <PillLink
              href={buildUrl({ category: category.slug })}
              active={active === category.slug}
            >
              {category.name}
            </PillLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PillLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center border px-3.5 font-sans text-[0.8125rem] font-medium transition-colors",
        active
          ? "border-neabi-black bg-neabi-black text-neabi-cream"
          : "border-ink-900/20 text-ink-700 hover:border-ink-900/45 hover:text-ink-900",
      )}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Ordenação
// ---------------------------------------------------------------------------

export function SortSelect({ value }: { value: string }) {
  const { apply } = useCatalogUrl();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="ordenacao"
        className="whitespace-nowrap font-sans text-[0.8125rem] font-medium text-ink-600"
      >
        Ordenar por
      </label>
      <select
        id="ordenacao"
        value={value}
        onChange={(event) => apply({ sort: event.target.value })}
        className="min-h-10 cursor-pointer border border-ink-900/20 bg-white px-3 pr-8 font-sans text-[0.875rem] text-ink-900 focus:border-ink-900 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filtros ativos
// ---------------------------------------------------------------------------

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export function ActiveFilters({ filters }: { filters: ActiveFilter[] }) {
  const { apply, clearAll } = useCatalogUrl();
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-sans text-[0.8125rem] font-medium text-ink-500">
        Filtros ativos:
      </span>
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value}`}
          type="button"
          onClick={() => apply({ [filter.key]: null })}
          className="inline-flex min-h-8 items-center gap-1.5 border border-ink-900/20 bg-white px-2.5 font-sans text-[0.8125rem] text-ink-700 transition-colors hover:border-neabi-red hover:text-neabi-red-700"
        >
          {filter.label}
          <span aria-hidden="true">×</span>
          <span className="sr-only">Remover filtro {filter.label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="min-h-8 font-sans text-[0.8125rem] font-semibold text-neabi-red-600 underline underline-offset-4 hover:text-neabi-red-700"
      >
        Limpar tudo
      </button>
    </div>
  );
}
