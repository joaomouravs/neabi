"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  AVAILABILITY_FILTERS,
  categoryTone,
  materialTypeLabels,
  type NeabiTone,
} from "@/config/catalog";
import type { MaterialType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { SortSheet } from "./catalog-controls";
import { useCatalogUrl } from "./use-catalog-url";

export interface FacetOption {
  slug: string;
  name: string;
  bookCount: number;
}

export interface FilterFacets {
  categories: FacetOption[];
  subjects: FacetOption[];
  contributors: FacetOption[];
  materialTypes: { value: MaterialType; bookCount: number }[];
  yearRange: { min: number | null; max: number | null };
}

const TONE_DOT: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};

/**
 * Filtros do acervo.
 *
 * Desktop: coluna lateral fixa durante a rolagem. Celular e tablet: uma barra
 * `[Filtros] [Ordenar]` presa sob o cabeçalho, com os filtros num painel
 * inferior. O conteúdo é o mesmo componente nos dois casos — sem divergência
 * de comportamento entre tamanhos de tela.
 */
export function FilterSidebar({ facets }: { facets: FilterFacets }) {
  return (
    <aside
      aria-labelledby="filtros-titulo"
      className="hidden lg:block lg:self-start lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)]"
    >
      <div className="scrollbar-none max-h-[calc(100dvh-var(--header-height-compact)-3rem)] overflow-y-auto pb-6 pr-1">
        <h2 id="filtros-titulo" className="font-display text-2xl font-bold text-ink-900">
          Filtros
        </h2>
        <div className="mt-4">
          <FilterFields facets={facets} />
        </div>
      </div>
    </aside>
  );
}

export function MobileFilterBar({ facets }: { facets: FilterFacets }) {
  const { activeCount } = useCatalogUrl();

  return (
    <div className="sticky top-[var(--header-height-compact)] z-30 -mx-5 border-b border-border bg-background px-5 py-3 md:-mx-8 md:px-8 lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        <BottomSheet
          title="Filtros"
          description="Refine as obras por eixo, disponibilidade, tipo de material, tema, autoria e ano."
          trigger={
            <Button variant="outline" className="w-full min-w-0">
              <SlidersHorizontal aria-hidden="true" />
              Filtros
              {activeCount > 0 ? (
                <span className="inline-flex size-5 items-center justify-center bg-neabi-red-600 text-[0.6875rem] font-bold text-white">
                  {activeCount}
                  <span className="sr-only"> ativos</span>
                </span>
              ) : null}
            </Button>
          }
          footer={(close) => (
            <Button size="lg" className="w-full" onClick={close}>
              Ver resultados
            </Button>
          )}
        >
          <FilterFields facets={facets} />
        </BottomSheet>
        <SortSheet />
      </div>
    </div>
  );
}

function FilterFields({ facets }: { facets: FilterFacets }) {
  const { buildUrl, current, clearAll, activeCount } = useCatalogUrl();

  const optionHref = (key: string, value: string) =>
    buildUrl({ [key]: current(key) === value ? null : value });

  return (
    <div className="flex flex-col divide-y divide-border">
      {facets.categories.length > 0 ? (
        <FilterGroup title="Eixo temático">
          <ul className="flex flex-col gap-0.5">
            {facets.categories.map((category) => (
              <li key={category.slug}>
                <OptionLink
                  href={optionHref("category", category.slug)}
                  active={current("category") === category.slug}
                  count={category.bookCount}
                  dot={TONE_DOT[categoryTone(category.slug)]}
                >
                  {category.name}
                </OptionLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Disponibilidade">
        <ul className="flex flex-col gap-0.5">
          {AVAILABILITY_FILTERS.map((option) => (
            <li key={option.value}>
              <OptionLink
                href={optionHref("availability", option.value)}
                active={current("availability") === option.value}
              >
                {option.label}
              </OptionLink>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {facets.materialTypes.length > 1 ? (
        <FilterGroup title="Tipo de material">
          <ul className="flex flex-col gap-0.5">
            {facets.materialTypes.map((type) => (
              <li key={type.value}>
                <OptionLink
                  href={optionHref("type", type.value)}
                  active={current("type") === type.value}
                  count={type.bookCount}
                >
                  {materialTypeLabels[type.value]}
                </OptionLink>
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      {facets.subjects.length > 0 ? (
        <FilterGroup title="Tema e assunto">
          <SearchableOptions
            param="subject"
            options={facets.subjects}
            filterLabel="Filtrar temas"
            optionHref={optionHref}
            activeSlug={current("subject")}
          />
        </FilterGroup>
      ) : null}

      {facets.contributors.length > 0 ? (
        <FilterGroup title="Autoria e organização">
          <SearchableOptions
            param="author"
            options={facets.contributors}
            filterLabel="Filtrar nomes"
            optionHref={optionHref}
            activeSlug={current("author")}
          />
        </FilterGroup>
      ) : null}

      {facets.yearRange.min !== null && facets.yearRange.max !== null ? (
        <FilterGroup title="Ano de publicação">
          <YearRange min={facets.yearRange.min} max={facets.yearRange.max} />
        </FilterGroup>
      ) : null}

      <div className="py-5">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={activeCount === 0}
          onClick={clearAll}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="py-5 first:pt-2">
      <h3 id={id} className="eyebrow mb-3 tracking-[0.12em] text-ink-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function OptionLink({
  href,
  active,
  count,
  dot,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex min-h-10 w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-[0.9375rem] leading-snug transition-colors duration-150",
        active
          ? "bg-neabi-black text-neabi-cream"
          : "text-ink-700 hover:bg-neabi-cream-200/70 hover:text-ink-900",
      )}
    >
      {dot ? <span aria-hidden="true" className={cn("size-1.5 shrink-0", dot)} /> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {active ? (
        <Check aria-hidden="true" className="size-4 shrink-0 text-neabi-amber" />
      ) : count !== undefined ? (
        <span aria-hidden="true" className="shrink-0 text-[0.75rem] tabular-nums text-ink-500">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

const VISIBLE_OPTIONS = 7;

function SearchableOptions({
  param,
  options,
  filterLabel,
  optionHref,
  activeSlug,
}: {
  param: string;
  options: FacetOption[];
  filterLabel: string;
  optionHref: (key: string, value: string) => string;
  activeSlug?: string;
}) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputId = useId();

  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const filtered = filter
    ? options.filter((option) => normalize(option.name).includes(normalize(filter)))
    : options;
  // A opção ativa nunca some atrás do "mostrar mais".
  const visible =
    expanded || filter
      ? filtered
      : filtered.filter(
          (option, index) => index < VISIBLE_OPTIONS || option.slug === activeSlug,
        );

  return (
    <div>
      {options.length > VISIBLE_OPTIONS ? (
        <>
          <label htmlFor={inputId} className="sr-only">
            {filterLabel}
          </label>
          <input
            id={inputId}
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={filterLabel}
            className="mb-2 min-h-10 w-full border border-ink-900/15 bg-white px-3 text-[0.875rem] text-ink-900 placeholder:text-ink-500 focus:border-ink-900 focus-visible:outline-2"
          />
        </>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {visible.map((option) => (
          <li key={option.slug}>
            <OptionLink
              href={optionHref(param, option.slug)}
              active={activeSlug === option.slug}
              count={option.bookCount}
            >
              {option.name}
            </OptionLink>
          </li>
        ))}
      </ul>
      {filter && filtered.length === 0 ? (
        <p className="px-2.5 py-2 text-[0.8125rem] text-ink-500">Nenhum nome encontrado.</p>
      ) : null}
      {!filter && filtered.length > VISIBLE_OPTIONS ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 px-2.5 text-[0.8125rem] font-semibold text-neabi-red-700 underline underline-offset-4 hover:text-neabi-red-900"
        >
          {expanded ? "Mostrar menos" : `Mostrar todos (${filtered.length})`}
        </button>
      ) : null}
    </div>
  );
}

function YearRange({ min, max }: { min: number; max: number }) {
  const { apply, current } = useCatalogUrl();
  const from = current("yearFrom") ?? "";
  const to = current("yearTo") ?? "";

  return (
    <div>
      {/* A chave recria os campos quando a URL muda por fora (limpar filtros). */}
      <div key={`${from}-${to}`} className="flex items-center gap-2">
        <YearInput label="De" defaultValue={from} min={min} max={max} onCommit={(value) => apply({ yearFrom: value })} />
        <span aria-hidden="true" className="text-ink-400">
          –
        </span>
        <YearInput label="Até" defaultValue={to} min={min} max={max} onCommit={(value) => apply({ yearTo: value })} />
      </div>
      <p className="mt-2 text-[0.75rem] leading-snug text-ink-500">
        Obras sem ano informado não aparecem quando este filtro é usado.
      </p>
    </div>
  );
}

function YearInput({
  label,
  defaultValue,
  min,
  max,
  onCommit,
}: {
  label: string;
  defaultValue: string;
  min: number;
  max: number;
  onCommit: (value: string | null) => void;
}) {
  const commit = (raw: string) => {
    const value = raw.trim();
    if (value !== defaultValue) onCommit(value || null);
  };

  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        defaultValue={defaultValue}
        min={min}
        max={max}
        placeholder={label === "De" ? String(min) : String(max)}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
          }
        }}
        className="min-h-10 w-full border border-ink-900/15 bg-white px-2.5 text-[0.875rem] text-ink-900 focus:border-ink-900 focus-visible:outline-2"
      />
    </label>
  );
}
