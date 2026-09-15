"use client";

import { ArrowDownUp, Check, X } from "lucide-react";
import Link from "next/link";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { DEFAULT_SORT, SORT_OPTIONS, categoryTone, type NeabiTone } from "@/config/catalog";
import { cn } from "@/lib/utils";

import { SearchCombobox } from "./search-combobox";
import { useCatalogUrl } from "./use-catalog-url";

/**
 * Controles do acervo: busca, eixos rápidos, ordenação e filtros ativos.
 *
 * Tudo escreve na URL. Os eixos são links reais — funcionam com o JavaScript
 * ainda carregando, abrem em nova aba e são navegáveis por teclado.
 */

const TONE_DOT: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

export function CatalogSearch({ initialValue }: { initialValue: string }) {
  const { apply } = useCatalogUrl();

  return (
    <SearchCombobox
      initialValue={initialValue}
      label="Buscar no acervo por título, autoria, assunto, editora ou ISBN"
      onSubmitQuery={(query) => apply({ q: query || null })}
    />
  );
}

// ---------------------------------------------------------------------------
// Eixos em linha (celular e tablet)
// ---------------------------------------------------------------------------

export interface QuickFilter {
  slug: string;
  name: string;
  bookCount: number;
}

export function CategoryPills({ categories }: { categories: QuickFilter[] }) {
  const { buildUrl, current } = useCatalogUrl();
  const active = current("category");

  return (
    <nav aria-label="Filtrar por eixo" className="-mx-5 md:-mx-8">
      <ul className="scrollbar-none flex gap-2 overflow-x-auto px-5 pb-1 md:px-8">
        <li className="shrink-0">
          <PillLink href={buildUrl({ category: null })} active={!active}>
            Todos
          </PillLink>
        </li>
        {categories.map((category) => (
          <li key={category.slug} className="shrink-0">
            <PillLink
              href={buildUrl({ category: active === category.slug ? null : category.slug })}
              active={active === category.slug}
              tone={categoryTone(category.slug)}
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
  tone,
  children,
}: {
  href: string;
  active: boolean;
  tone?: NeabiTone;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 whitespace-nowrap border px-3.5 font-sans text-[0.875rem] font-medium transition-colors",
        active
          ? "border-neabi-black bg-neabi-black text-neabi-cream"
          : "border-ink-900/15 bg-surface text-ink-700 hover:border-ink-900/45 hover:text-ink-900",
      )}
    >
      {tone ? <span aria-hidden="true" className={cn("size-1.5", TONE_DOT[tone])} /> : null}
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Ordenação
// ---------------------------------------------------------------------------

function sortValueFor(value: string) {
  return value === DEFAULT_SORT ? null : value;
}

/** Seletor nativo para o desktop — acessível e familiar. */
export function SortSelect() {
  const { apply, current } = useCatalogUrl();
  const value = current("sort") ?? DEFAULT_SORT;

  return (
    <div className="flex items-center gap-2.5">
      <label
        htmlFor="ordenacao"
        className="whitespace-nowrap font-sans text-[0.8125rem] font-medium text-ink-600"
      >
        Ordenar por
      </label>
      <select
        id="ordenacao"
        value={value}
        onChange={(event) => apply({ sort: sortValueFor(event.target.value) })}
        className="min-h-10 cursor-pointer appearance-none border border-ink-900/20 bg-white bg-size-[10px] bg-position-[right_0.75rem_center] bg-no-repeat py-2 pl-3 pr-8 font-sans text-[0.875rem] text-ink-900 transition-colors [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 11 7%22><path d=%22M1 1l4.5 4.5L10 1%22 fill=%22none%22 stroke=%22%234D4842%22 stroke-width=%221.6%22/></svg>')] hover:border-ink-900/40 focus:border-ink-900 focus-visible:outline-2"
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

/** Ordenação em painel inferior para o celular. */
export function SortSheet() {
  const { apply, current } = useCatalogUrl();
  const value = current("sort") ?? DEFAULT_SORT;
  const label = SORT_OPTIONS.find((option) => option.value === value)?.label;

  return (
    <BottomSheet
      title="Ordenar"
      description="Escolha a ordem de exibição das obras."
      trigger={
        <Button variant="outline" className="w-full min-w-0">
          <ArrowDownUp aria-hidden="true" />
          <span className="truncate">Ordenar</span>
          <span className="sr-only">: {label}</span>
        </Button>
      }
    >
      <SortOptions value={value} onChange={(next) => apply({ sort: sortValueFor(next) })} />
    </BottomSheet>
  );
}

function SortOptions({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Ordem das obras</legend>
      <div className="flex flex-col">
        {SORT_OPTIONS.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-border text-[1rem] text-ink-800 last:border-b-0"
            >
              <input
                type="radio"
                name="ordenacao-movel"
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-ink-900/35 peer-checked:border-neabi-red-600 peer-checked:bg-neabi-red-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neabi-red-600"
              >
                <span className={cn("size-2 rounded-full bg-white", checked ? "block" : "hidden")} />
              </span>
              <span className={cn("flex-1", checked && "font-semibold text-ink-900")}>
                {option.label}
              </span>
              {checked ? <Check aria-hidden="true" className="size-4 text-neabi-red-600" /> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
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
      <span className="mr-1 font-sans text-[0.8125rem] font-medium text-ink-500">
        Filtros ativos:
      </span>
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value}`}
          type="button"
          onClick={() => apply({ [filter.key]: null })}
          className="group inline-flex min-h-9 items-center gap-2 border border-ink-900/20 bg-surface pl-3 pr-2 font-sans text-[0.8125rem] text-ink-800 transition-colors hover:border-neabi-red-600 hover:text-neabi-red-700"
        >
          {filter.label}
          <X aria-hidden="true" className="size-3.5 text-ink-500 group-hover:text-neabi-red-700" />
          <span className="sr-only">— remover filtro</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-1 min-h-9 font-sans text-[0.8125rem] font-semibold text-neabi-red-700 underline underline-offset-4 hover:text-neabi-red-900"
      >
        Limpar filtros
      </button>
    </div>
  );
}

/** Botão de limpar para o estado vazio (componente de servidor não tem router). */
export function ClearFiltersButton() {
  const { clearAll } = useCatalogUrl();
  return (
    <Button onClick={clearAll} size="lg">
      Limpar filtros
    </Button>
  );
}
