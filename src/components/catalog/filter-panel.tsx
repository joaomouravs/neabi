"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AVAILABILITY_FILTERS, materialTypeLabels } from "@/config/catalog";
import { MaterialType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { useCatalogUrl } from "./use-catalog-url";

export interface FilterFacets {
  subjects: { slug: string; name: string; bookCount: number }[];
  contributors: { slug: string; name: string; bookCount: number }[];
  materialTypes: MaterialType[];
  yearRange: { min: number | null; max: number | null };
}

/**
 * Filtros avançados.
 *
 * No desktop ficam numa coluna lateral persistente; no mobile, numa gaveta
 * inferior. O conteúdo é o mesmo componente nos dois casos — sem duplicação de
 * lógica nem divergência de comportamento entre tamanhos de tela.
 */
export function FilterPanel({
  facets,
  activeCount,
}: {
  facets: FilterFacets;
  activeCount: number;
}) {
  return (
    <>
      <aside
        aria-labelledby="filtros-titulo"
        className="hidden lg:block lg:w-64 lg:shrink-0"
      >
        <h2
          id="filtros-titulo"
          className="font-display text-lg font-semibold text-ink-900"
        >
          Filtros
        </h2>
        <div className="mt-5">
          <FilterFields facets={facets} />
        </div>
      </aside>

      <MobileFilterDrawer facets={facets} activeCount={activeCount} />
    </>
  );
}

function MobileFilterDrawer({
  facets,
  activeCount,
}: {
  facets: FilterFacets;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.26;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="md" className="lg:hidden">
          Filtros
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex size-5 items-center justify-center bg-neabi-red text-[0.6875rem] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
                className="fixed inset-0 z-50 bg-neabi-black/55 lg:hidden"
              />
            </Dialog.Overlay>

            {/* Radix cuida do focus trap, do Escape e de `aria-modal`. */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration, ease: "easeOut" }}
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col bg-background lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <Dialog.Title className="font-display text-xl font-semibold text-ink-900">
                    Filtros
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center text-ink-600"
                    >
                      <span aria-hidden="true" className="text-2xl leading-none">
                        ×
                      </span>
                      <span className="sr-only">Fechar filtros</span>
                    </button>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Refine os resultados do acervo por assunto, autoria, tipo de
                  material, ano e disponibilidade.
                </Dialog.Description>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <FilterFields facets={facets} onApply={() => setOpen(false)} />
                </div>

                <div className="border-t border-border px-5 py-4">
                  <Dialog.Close asChild>
                    <Button className="w-full" size="lg">
                      Ver resultados
                    </Button>
                  </Dialog.Close>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function FilterFields({
  facets,
  onApply,
}: {
  facets: FilterFacets;
  onApply?: () => void;
}) {
  const { apply, current, clearAll } = useCatalogUrl();

  const handleChange = (key: string, value: string | null) => {
    apply({ [key]: value });
    onApply?.();
  };

  return (
    <div className="flex flex-col divide-y divide-border">
      <FilterGroup title="Disponibilidade">
        <div className="flex flex-col gap-2">
          {AVAILABILITY_FILTERS.map((option) => {
            const checked = current("availability") === option.value;
            return (
              <label
                key={option.value}
                className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink-700"
              >
                <input
                  type="radio"
                  name="availability"
                  checked={checked}
                  onChange={() => handleChange("availability", option.value)}
                  className="size-4 cursor-pointer accent-[var(--neabi-red)]"
                />
                {option.label}
              </label>
            );
          })}
          {current("availability") ? (
            <button
              type="button"
              onClick={() => handleChange("availability", null)}
              className="self-start text-[0.8125rem] font-medium text-neabi-red-600 underline underline-offset-4"
            >
              Limpar disponibilidade
            </button>
          ) : null}
        </div>
      </FilterGroup>

      <FilterGroup title="Tipo de material">
        <select
          value={current("type") ?? ""}
          onChange={(event) => handleChange("type", event.target.value || null)}
          aria-label="Tipo de material"
          className="min-h-10 w-full cursor-pointer border border-ink-900/20 bg-white px-3 text-[0.875rem] text-ink-900 focus:border-ink-900 focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          {facets.materialTypes.map((type) => (
            <option key={type} value={type}>
              {materialTypeLabels[type]}
            </option>
          ))}
        </select>
      </FilterGroup>

      {facets.subjects.length > 0 ? (
        <FilterGroup title="Assunto">
          <ScrollableOptions
            options={facets.subjects}
            activeSlug={current("subject")}
            onSelect={(slug) => handleChange("subject", slug)}
          />
        </FilterGroup>
      ) : null}

      {facets.contributors.length > 0 ? (
        <FilterGroup title="Autoria e organização">
          <ScrollableOptions
            options={facets.contributors}
            activeSlug={current("author")}
            onSelect={(slug) => handleChange("author", slug)}
          />
        </FilterGroup>
      ) : null}

      {facets.yearRange.min !== null && facets.yearRange.max !== null ? (
        <FilterGroup title="Ano de publicação">
          <div className="flex items-center gap-2">
            <YearInput
              label="De"
              value={current("yearFrom")}
              min={facets.yearRange.min}
              max={facets.yearRange.max}
              onCommit={(value) => handleChange("yearFrom", value)}
            />
            <span aria-hidden="true" className="text-ink-400">
              —
            </span>
            <YearInput
              label="Até"
              value={current("yearTo")}
              min={facets.yearRange.min}
              max={facets.yearRange.max}
              onCommit={(value) => handleChange("yearTo", value)}
            />
          </div>
          <p className="mt-2 text-[0.75rem] leading-snug text-ink-500">
            Obras sem ano informado não aparecem quando este filtro é usado.
          </p>
        </FilterGroup>
      ) : null}

      <div className="pt-5">
        <button
          type="button"
          onClick={() => {
            clearAll();
            onApply?.();
          }}
          className="font-sans text-[0.875rem] font-semibold text-neabi-red-600 underline underline-offset-4 hover:text-neabi-red-700"
        >
          Limpar todos os filtros
        </button>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="py-5 first:pt-0">
      <legend className="mb-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function ScrollableOptions({
  options,
  activeSlug,
  onSelect,
}: {
  options: { slug: string; name: string; bookCount: number }[];
  activeSlug?: string;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <ul className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
      {options.map((option) => {
        const active = activeSlug === option.slug;
        return (
          <li key={option.slug}>
            <button
              type="button"
              onClick={() => onSelect(active ? null : option.slug)}
              aria-pressed={active}
              className={cn(
                "flex min-h-9 w-full items-center justify-between gap-3 px-2 text-left text-[0.875rem] transition-colors",
                active
                  ? "bg-neabi-black text-neabi-cream"
                  : "text-ink-700 hover:bg-neabi-cream-200/60",
              )}
            >
              <span className="line-clamp-1">{option.name}</span>
              <span
                className={cn(
                  "shrink-0 text-[0.75rem] tabular-nums",
                  active ? "text-neabi-cream/70" : "text-ink-400",
                )}
              >
                {option.bookCount}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function YearInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value?: string;
  min: number;
  max: number;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        placeholder={label === "De" ? String(min) : String(max)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onCommit(draft.trim() || null)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit(draft.trim() || null);
          }
        }}
        className="min-h-10 w-full border border-ink-900/20 bg-white px-2.5 text-[0.875rem] text-ink-900 focus:border-ink-900 focus:outline-none"
      />
    </label>
  );
}
