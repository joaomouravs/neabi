"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { mainNavigation } from "@/config/site";
import { cn } from "@/lib/utils";

import { NeabiMark } from "./neabi-mark";
import { Container } from "./primitives";

export interface HeaderUser {
  name: string | null;
  email: string;
  isStaff: boolean;
}

/**
 * Cabeçalho do site.
 *
 * Mantém três estados independentes — busca, menu móvel e rota ativa — e
 * garante o essencial de acessibilidade: `aria-current` no link da seção atual,
 * `aria-expanded` nos gatilhos, fechamento por Escape e devolução do foco.
 */
export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);

  /**
   * Navegar fecha qualquer painel aberto.
   *
   * O ajuste é feito durante a renderização, e não em um efeito: é o padrão
   * recomendado para reagir a mudança de props e evita uma renderização extra
   * em cascata a cada troca de rota.
   */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (searchOpen) {
        setSearchOpen(false);
        searchToggleRef.current?.focus();
      }
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, searchOpen]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    const term = typeof value === "string" ? value.trim() : "";
    router.push(term ? `/acervo?q=${encodeURIComponent(term)}` : "/acervo");
    setSearchOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const duration = reducedMotion ? 0 : 0.22;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <Container className="flex h-[4.5rem] items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0"
          aria-label="Biblioteca NEABI — página inicial"
        >
          <NeabiMark />
        </Link>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative px-3 py-2 font-sans text-[0.9375rem] font-medium transition-colors",
                    isActive(item.href)
                      ? "text-ink-900"
                      : "text-ink-600 hover:text-ink-900",
                  )}
                >
                  {item.label}
                  {isActive(item.href) ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-px h-0.5 bg-neabi-red"
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            ref={searchToggleRef}
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-expanded={searchOpen}
            aria-controls="busca-cabecalho"
            className="flex size-11 items-center justify-center text-ink-700 transition-colors hover:text-ink-900"
          >
            <SearchIcon />
            <span className="sr-only">
              {searchOpen ? "Fechar busca" : "Buscar no acervo"}
            </span>
          </button>

          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              {user.isStaff ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">Painel</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link href="/minha-conta">Minha conta</Link>
              </Button>
            </div>
          ) : (
            <Button asChild variant="dark" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-movel"
            className="flex size-11 items-center justify-center text-ink-800 lg:hidden"
          >
            <MenuIcon open={menuOpen} />
            <span className="sr-only">{menuOpen ? "Fechar menu" : "Abrir menu"}</span>
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {searchOpen ? (
          <motion.div
            id="busca-cabecalho"
            key="search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-surface"
          >
            <Container className="py-4">
              <form onSubmit={handleSearch} role="search">
                <label htmlFor="busca-rapida" className="sr-only">
                  Buscar livros, autores ou temas
                </label>
                <div className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    id="busca-rapida"
                    name="q"
                    type="search"
                    placeholder="Buscar livros, autores ou temas"
                    className="min-h-11 w-full border border-ink-900/20 bg-white px-3.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none"
                  />
                  <Button type="submit">Buscar</Button>
                </div>
              </form>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div
            id="menu-movel"
            key="menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-surface lg:hidden"
          >
            <Container className="py-4">
              <nav aria-label="Navegação principal (dispositivos móveis)">
                <ul className="flex flex-col">
                  {mainNavigation.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center border-b border-border font-display text-xl font-semibold",
                          isActive(item.href) ? "text-neabi-red" : "text-ink-800",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-4 flex flex-col gap-2">
                {user ? (
                  <>
                    {user.isStaff ? (
                      <Button asChild variant="outline">
                        <Link href="/admin">Painel administrativo</Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="dark">
                      <Link href="/minha-conta">Minha conta</Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="dark">
                    <Link href="/login">Entrar</Link>
                  </Button>
                )}
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="8.5" cy="8.5" r="5.75" />
      <path d="M12.8 12.8 17 17" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="M5 5l12 12" />
          <path d="M17 5 5 17" />
        </>
      ) : (
        <>
          <path d="M3 6h16" />
          <path d="M3 11h16" />
          <path d="M3 16h16" />
        </>
      )}
    </svg>
  );
}
