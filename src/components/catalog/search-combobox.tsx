"use client";

import { ArrowRight, Clock, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { SearchSuggestionsResponse } from "@/app/api/busca/sugestoes/route";
import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { categoryTone } from "@/config/catalog";
import { cn } from "@/lib/utils";

import {
  clearRecentSearches,
  readRecentSearches,
  saveRecentSearch,
} from "./recent-searches";

/**
 * Busca com sugestões.
 *
 * Padrão ARIA de combobox com lista: o foco fica sempre no campo, as setas
 * percorrem as opções (`aria-activedescendant`), Enter abre a opção ativa ou,
 * sem opção ativa, leva a `/acervo?q=…`, e Escape fecha a lista.
 *
 * As sugestões vêm de `/api/busca/sugestoes`, com a mesma semântica da busca
 * completa — nada é inventado no cliente. Sem JavaScript, o formulário continua
 * sendo um GET comum para `/acervo`.
 */

type OptionKind = "book" | "category" | "author" | "all" | "recent";

interface Option {
  key: string;
  kind: OptionKind;
  href: string;
  /** Termo a guardar no histórico quando a opção é escolhida. */
  query?: string;
}

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 180;

export interface SearchComboboxProps {
  variant?: "hero" | "light";
  /** `floating` sobrepõe o conteúdo; `inline` empurra (overlay do header). */
  panel?: "floating" | "inline";
  initialValue?: string;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  className?: string;
  /** Chamado antes de navegar — fecha o overlay que contém a busca. */
  onNavigate?: () => void;
  /**
   * Substitui a navegação padrão do Enter. O acervo usa para preservar os
   * filtros já aplicados.
   */
  onSubmitQuery?: (query: string) => void;
}

export function SearchCombobox({
  variant = "light",
  panel = "floating",
  initialValue = "",
  // Curto de propósito: cabe inteiro ao lado do botão em 375px.
  placeholder = "Livros, autores ou temas",
  label = "Buscar livros, autores ou temas",
  autoFocus = false,
  className,
  onNavigate,
  onSubmitQuery,
}: SearchComboboxProps) {
  const router = useRouter();
  const baseId = useId();
  const inputId = `${baseId}-campo`;
  const listId = `${baseId}-lista`;

  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [results, setResults] = useState<SearchSuggestionsResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);

  /**
   * Sincroniza com a URL quando a navegação vem de fora (voltar, link).
   * Ajustar durante a renderização evita a renderização extra de um efeito.
   */
  const [lastInitial, setLastInitial] = useState(initialValue);
  if (initialValue !== lastInitial) {
    setLastInitial(initialValue);
    setValue(initialValue);
    setResults(null);
    setStatus("idle");
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      controller.current?.abort();
    };
  }, []);

  const term = value.trim();
  const typing = term.length >= MIN_LENGTH;

  // -------------------------------------------------------------------------
  // Opções navegáveis, na ordem em que aparecem
  // -------------------------------------------------------------------------

  const options: Option[] = [];
  if (!typing) {
    for (const entry of recent) {
      options.push({
        key: `recent-${entry}`,
        kind: "recent",
        href: `/acervo?q=${encodeURIComponent(entry)}`,
        query: entry,
      });
    }
  } else if (results && status === "ready") {
    for (const book of results.books) {
      options.push({ key: `book-${book.slug}`, kind: "book", href: `/acervo/${book.slug}`, query: term });
    }
    for (const category of results.categories) {
      options.push({
        key: `category-${category.slug}`,
        kind: "category",
        href: `/acervo?category=${category.slug}`,
      });
    }
    for (const author of results.authors) {
      options.push({
        key: `author-${author.slug}`,
        kind: "author",
        href: `/acervo?author=${author.slug}`,
      });
    }
    options.push({
      key: "all",
      kind: "all",
      href: `/acervo?q=${encodeURIComponent(term)}`,
      query: term,
    });
  }

  const indexOf = (key: string) => options.findIndex((option) => option.key === key);
  const optionId = (index: number) => `${listId}-opcao-${index}`;
  const panelVisible =
    open && (typing ? status !== "idle" : recent.length > 0);

  // -------------------------------------------------------------------------
  // Busca de sugestões (disparada pelo evento de digitação, não por efeito)
  // -------------------------------------------------------------------------

  function requestSuggestions(next: string) {
    window.clearTimeout(timer.current);
    controller.current?.abort();

    const query = next.trim();
    if (query.length < MIN_LENGTH) {
      setResults(null);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    timer.current = window.setTimeout(async () => {
      const current = new AbortController();
      controller.current = current;
      try {
        const response = await fetch(
          `/api/busca/sugestoes?q=${encodeURIComponent(query)}`,
          { signal: current.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as SearchSuggestionsResponse;
        setResults(data);
        setStatus("ready");
        setActiveIndex(-1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      }
    }, DEBOUNCE_MS);
  }

  function go(option: Option) {
    if (option.query) saveRecentSearch(option.query);
    setOpen(false);
    setActiveIndex(-1);
    onNavigate?.();
    router.push(option.href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = panelVisible ? options[activeIndex] : undefined;
    if (active) {
      go(active);
      return;
    }

    if (term) saveRecentSearch(term);
    setOpen(false);
    setActiveIndex(-1);

    if (onSubmitQuery) {
      onSubmitQuery(term);
      return;
    }
    onNavigate?.();
    router.push(term ? `/acervo?q=${encodeURIComponent(term)}` : "/acervo");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => {
        if (event.key === "ArrowDown") return index + 1 >= options.length ? 0 : index + 1;
        return index <= 0 ? options.length - 1 : index - 1;
      });
    } else if (event.key === "Escape" && panelVisible) {
      // Fecha só a lista; um segundo Escape chega a quem contém a busca.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const hero = variant === "hero";

  const announcement =
    !open || !typing
      ? ""
      : status === "loading"
        ? "Buscando sugestões…"
        : status === "error"
          ? "Não foi possível carregar sugestões."
          : results && results.total === 0
            ? // Texto diferente do painel visível: o anúncio não duplica o
              // conteúdo na árvore de acessibilidade.
              `Nenhuma obra corresponde a “${term}”.`
            : results
              ? `${results.total} ${results.total === 1 ? "obra encontrada" : "obras encontradas"}.`
              : "";

  return (
    <form
      role="search"
      action="/acervo"
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      className={cn("relative w-full", className)}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <div
        className={cn(
          "flex items-stretch transition-[box-shadow,border-color,outline-color] duration-200 ease-editorial",
          hero
            ? "bg-white p-1.5 shadow-[0_22px_48px_-24px_rgb(0_0_0/0.75)] outline-0 outline-neabi-amber/0 focus-within:outline-4 focus-within:outline-offset-0 focus-within:outline-neabi-amber"
            : "border border-ink-900/20 bg-white hover:border-ink-900/40 focus-within:border-ink-900 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neabi-red-600",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center justify-center text-ink-500",
            hero ? "w-10 sm:w-12" : "w-11",
          )}
        >
          <Search className={hero ? "size-5" : "size-4.5"} />
        </span>

        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={panelVisible}
          aria-controls={listId}
          aria-activedescendant={
            panelVisible && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            requestSuggestions(event.target.value);
          }}
          onFocus={() => {
            setRecent(readRecentSearches());
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-sans text-ink-900 placeholder:text-ink-500 focus-visible:outline-none",
            hero ? "min-h-12 text-base sm:min-h-14 sm:text-lg" : "min-h-12 text-base sm:text-[0.9375rem]",
          )}
        />

        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setResults(null);
              setStatus("idle");
              inputRef.current?.focus();
              if (onSubmitQuery && initialValue) onSubmitQuery("");
            }}
            className="flex w-10 shrink-0 items-center justify-center text-ink-500 transition-colors hover:text-ink-900"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Limpar busca</span>
          </button>
        ) : null}

        <Button
          type="submit"
          size={hero ? "lg" : "md"}
          className={cn("shrink-0", hero ? "px-5 sm:px-8" : "m-[3px] min-h-0 px-5")}
        >
          Buscar
        </Button>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {panelVisible ? (
        <div
          className={cn(
            "overflow-hidden border border-border bg-surface text-left text-ink-900",
            panel === "floating"
              ? "absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 shadow-overlay motion-safe:animate-fade-up"
              : "mt-3",
          )}
        >
          <div
            id={listId}
            role="listbox"
            aria-label="Sugestões de busca"
            className="max-h-[min(62vh,32rem)] overflow-y-auto overscroll-contain py-2"
          >
            {!typing ? (
              <OptionGroup
                title="Buscas recentes"
                action={
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                      inputRef.current?.focus();
                    }}
                    className="text-[0.75rem] font-medium text-ink-500 underline underline-offset-2 hover:text-ink-900"
                  >
                    Limpar
                  </button>
                }
              >
                {recent.map((entry) => {
                  const index = indexOf(`recent-${entry}`);
                  return (
                    <OptionRow
                      key={entry}
                      id={optionId(index)}
                      active={index === activeIndex}
                      onHover={() => setActiveIndex(index)}
                      onSelect={() => go(options[index])}
                    >
                      <Clock aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                      <span className="truncate text-[0.9375rem]">{entry}</span>
                    </OptionRow>
                  );
                })}
              </OptionGroup>
            ) : status === "loading" && !results ? (
              <div className="flex items-center gap-3 px-4 py-4 text-[0.875rem] text-ink-600">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                Buscando no acervo…
              </div>
            ) : status === "error" ? (
              <p className="px-4 py-4 text-[0.875rem] text-ink-600">
                Não foi possível carregar sugestões agora. Pressione Enter para
                buscar no acervo.
              </p>
            ) : results ? (
              <>
                {results.total === 0 ? (
                  <div className="px-4 pb-2 pt-3">
                    <p className="font-display text-xl font-semibold text-ink-900">
                      Nenhum resultado encontrado
                    </p>
                    <p className="mt-1 text-[0.875rem] leading-snug text-ink-600">
                      Nenhuma obra corresponde a “{term}”. Confira a grafia ou
                      tente um termo mais amplo.
                    </p>
                  </div>
                ) : null}

                {results.books.length > 0 ? (
                  <OptionGroup title="Obras">
                    {results.books.map((book) => {
                      const index = indexOf(`book-${book.slug}`);
                      return (
                        <OptionRow
                          key={book.slug}
                          id={optionId(index)}
                          active={index === activeIndex}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => go(options[index])}
                        >
                          <span className="w-9 shrink-0 sm:w-10">
                            <BookCover
                              title={book.title}
                              coverImage={book.cover}
                              coverAlt={book.coverAlt}
                              tone={categoryTone(book.categorySlug)}
                              sizes="40px"
                              decorative
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-[0.9375rem] font-medium leading-snug text-ink-900">
                              {book.title}
                            </span>
                            <span className="mt-0.5 line-clamp-1 text-[0.8125rem] leading-snug text-ink-500">
                              {[book.credit, book.category].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "hidden size-2 shrink-0 rounded-full sm:block",
                              book.available ? "bg-neabi-green" : "bg-ink-300",
                            )}
                          />
                        </OptionRow>
                      );
                    })}
                  </OptionGroup>
                ) : null}

                {results.categories.length > 0 ? (
                  <OptionGroup title="Eixos do acervo">
                    {results.categories.map((category) => {
                      const index = indexOf(`category-${category.slug}`);
                      return (
                        <OptionRow
                          key={category.slug}
                          id={optionId(index)}
                          active={index === activeIndex}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => go(options[index])}
                        >
                          <span aria-hidden="true" className="h-4 w-1 shrink-0 bg-neabi-red" />
                          <span className="flex-1 truncate text-[0.9375rem]">{category.name}</span>
                          <span className="shrink-0 text-[0.75rem] tabular-nums text-ink-500">
                            {category.bookCount} {category.bookCount === 1 ? "obra" : "obras"}
                          </span>
                        </OptionRow>
                      );
                    })}
                  </OptionGroup>
                ) : null}

                {results.authors.length > 0 ? (
                  <OptionGroup title="Autoria e organização">
                    {results.authors.map((author) => {
                      const index = indexOf(`author-${author.slug}`);
                      return (
                        <OptionRow
                          key={author.slug}
                          id={optionId(index)}
                          active={index === activeIndex}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => go(options[index])}
                        >
                          <span
                            aria-hidden="true"
                            className="flex size-6 shrink-0 items-center justify-center bg-neabi-cream-200 font-display text-[0.8125rem] font-semibold text-ink-700"
                          >
                            {author.name.charAt(0)}
                          </span>
                          <span className="truncate text-[0.9375rem]">{author.name}</span>
                        </OptionRow>
                      );
                    })}
                  </OptionGroup>
                ) : null}

                <div className="mt-1 border-t border-border pt-1">
                  <OptionRow
                    id={optionId(indexOf("all"))}
                    active={indexOf("all") === activeIndex}
                    onHover={() => setActiveIndex(indexOf("all"))}
                    onSelect={() => go(options[indexOf("all")])}
                  >
                    <span className="flex-1 text-[0.875rem] font-semibold text-neabi-red-700">
                      {results.total > 0
                        ? `Ver todos os ${results.total} ${results.total === 1 ? "resultado" : "resultados"}`
                        : "Ver todos os resultados"}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-neabi-red-700" />
                  </OptionRow>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function OptionGroup({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="py-1">
      <div className="flex items-center justify-between px-4 pb-1 pt-2">
        <p id={id} className="eyebrow tracking-[0.12em] text-ink-500">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function OptionRow({
  id,
  active,
  onHover,
  onSelect,
  children,
}: {
  id: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      // `mousedown` com preventDefault mantém o foco no campo.
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-100",
        active ? "bg-surface-muted" : "bg-transparent",
      )}
    >
      {children}
    </div>
  );
}
