"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SearchCombobox } from "@/components/catalog/search-combobox";
import { Button } from "@/components/ui/button";
import { mainNavigation } from "@/config/site";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

import { NeabiMark } from "./neabi-mark";
import { Container } from "./primitives";

export interface HeaderUser {
  name: string | null;
  email: string;
  isStaff: boolean;
}

const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * Cabeçalho do site.
 *
 * Desktop: marca, navegação central, busca e conta. Ao rolar, fica mais baixo
 * (transição de altura, sem blur). Mobile: marca, busca e menu — os links
 * desktop nunca são espremidos numa tela pequena; vão para um menu de tela
 * cheia.
 *
 * Busca e menu são diálogos Radix: foco preso, Escape fecha, rolagem do corpo
 * bloqueada e o foco volta para o botão que abriu.
 */
export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const searchTriggerRef = useRef<HTMLElement | null>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  /**
   * Navegar fecha qualquer painel aberto. O ajuste acontece durante a
   * renderização — reagir a uma mudança de prop sem efeito em cascata.
   */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  // Compacta ao rolar. A histerese (32px para compactar, 8px para expandir)
  // evita o header piscar quando a rolagem para perto do limite.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setCompact((current) => (current ? y > 8 : y > 32));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  // Atalho "/" abre a busca — convenção de bibliotecas e catálogos digitais.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      searchTriggerRef.current = document.activeElement as HTMLElement | null;
      setSearchOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const openSearch = (trigger: HTMLElement) => {
    searchTriggerRef.current = trigger;
    setSearchOpen(true);
  };

  const duration = reducedMotion ? 0 : 0.22;

  return (
    <header
      data-compact={compact || undefined}
      className={cn(
        "sticky top-0 z-50 border-b transition-[border-color,box-shadow] duration-200 ease-editorial",
        compact
          ? "border-border bg-background shadow-[0_8px_24px_-20px_rgb(13_13_13/0.35)]"
          : "border-transparent bg-background",
      )}
    >
      <form ref={logoutFormRef} action={logoutAction} hidden />

      <Container
        className={cn(
          "grid grid-cols-[auto_1fr_auto] items-center gap-4 transition-[height] duration-200 ease-editorial",
          compact ? "h-[var(--header-height-compact)]" : "h-[var(--header-height)]",
        )}
      >
        <Link
          href="/"
          className="justify-self-start"
          aria-label="Biblioteca NEABI-NI — página inicial"
        >
          <NeabiMark size={compact ? "sm" : "md"} />
        </Link>

        <nav aria-label="Navegação principal" className="hidden justify-self-center lg:block">
          <ul className="flex items-center gap-8">
            {mainNavigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "link-reveal py-1.5 font-sans text-[0.9375rem] font-medium",
                    isActive(item.href) ? "text-ink-900" : "text-ink-600 hover:text-ink-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 justify-self-end lg:gap-3">
          {/* Busca — campo aparente no desktop, ícone no celular. */}
          <button
            type="button"
            onClick={(event) => openSearch(event.currentTarget)}
            aria-haspopup="dialog"
            className="hidden min-h-10 items-center gap-2.5 border border-ink-900/15 bg-surface px-3 text-left font-sans text-[0.875rem] text-ink-500 transition-colors hover:border-ink-900/35 hover:text-ink-800 lg:flex lg:w-44 xl:w-56"
          >
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 truncate">Buscar no acervo</span>
            <kbd
              aria-hidden="true"
              className="hidden h-5 min-w-5 items-center justify-center border border-border-strong px-1 font-sans text-[0.6875rem] text-ink-500 xl:inline-flex"
            >
              /
            </kbd>
          </button>
          <button
            type="button"
            onClick={(event) => openSearch(event.currentTarget)}
            aria-haspopup="dialog"
            className="flex size-11 items-center justify-center text-ink-800 transition-colors hover:text-ink-900 lg:hidden"
          >
            <Search aria-hidden="true" className="size-5" />
            <span className="sr-only">Buscar no acervo</span>
          </button>

          <div className="hidden lg:block">
            {user ? (
              <AccountMenu user={user} onLogout={() => logoutFormRef.current?.requestSubmit()} />
            ) : (
              <Button asChild variant="dark" size="sm" className="min-h-10 px-5">
                <Link href="/login">Entrar</Link>
              </Button>
            )}
          </div>

          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="flex size-11 items-center justify-center text-ink-900 lg:hidden"
              >
                <Menu aria-hidden="true" className="size-6" />
                <span className="sr-only">Abrir menu</span>
              </button>
            </Dialog.Trigger>
            <AnimatePresence>
              {menuOpen ? (
                <Dialog.Portal forceMount>
                  {/* No Radix, o bloqueio de rolagem da página vive no Overlay:
                      sem ele, a roda do mouse sobre o menu rola o conteúdo de
                      trás. */}
                  <Dialog.Overlay className="fixed inset-0 z-[59] bg-neabi-black lg:hidden" />
                  <Dialog.Content asChild aria-describedby={undefined}>
                    <motion.div
                      initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                      transition={{ duration, ease: EASE }}
                      className="on-dark fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-neabi-black text-neabi-cream lg:hidden"
                    >
                      <MobileMenu
                        user={user}
                        pathname={pathname}
                        isActive={isActive}
                        onClose={() => setMenuOpen(false)}
                        onLogout={() => logoutFormRef.current?.requestSubmit()}
                      />
                    </motion.div>
                  </Dialog.Content>
                </Dialog.Portal>
              ) : null}
            </AnimatePresence>
          </Dialog.Root>
        </div>
      </Container>

      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <AnimatePresence>
          {searchOpen ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration }}
                  className="fixed inset-0 z-[60] bg-neabi-black/50"
                />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  searchTriggerRef.current?.focus();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
                  transition={{ duration, ease: EASE }}
                  className="fixed inset-x-0 top-0 z-[61] max-h-dvh min-h-dvh overflow-y-auto bg-background shadow-overlay md:min-h-0"
                >
                  <div aria-hidden="true" className="neabi-rule h-1 w-full" />
                  <Container className="py-5 md:py-10">
                    <div className="mx-auto max-w-3xl">
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <Dialog.Title className="font-display text-2xl font-bold text-ink-900 md:text-3xl">
                          Buscar no acervo
                        </Dialog.Title>
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            className="-mr-2 flex size-11 items-center justify-center text-ink-600 transition-colors hover:text-ink-900"
                          >
                            <X aria-hidden="true" className="size-5" />
                            <span className="sr-only">Fechar busca</span>
                          </button>
                        </Dialog.Close>
                      </div>
                      <SearchCombobox
                        autoFocus
                        panel="inline"
                        label="Buscar livros, autores ou temas"
                        onNavigate={() => setSearchOpen(false)}
                      />
                      <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-500">
                        Pesquise por título, autoria, organização, eixo, assunto,
                        editora ou ISBN. A busca ignora acentos.
                      </p>
                    </div>
                  </Container>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Menu da conta (desktop)
// ---------------------------------------------------------------------------

function firstName(user: HeaderUser): string {
  return user.name?.trim().split(/\s+/)[0] ?? user.email.split("@")[0];
}

function AccountMenu({ user, onLogout }: { user: HeaderUser; onLogout: () => void }) {
  const initial = (user.name?.trim() || user.email).charAt(0).toUpperCase();
  const itemClass =
    "flex min-h-10 cursor-pointer select-none items-center gap-3 px-3 font-sans text-[0.9375rem] text-ink-800 outline-none transition-colors data-[highlighted]:bg-surface-muted data-[highlighted]:text-ink-900";

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group flex min-h-11 items-center gap-2.5 pr-1 text-ink-800 transition-colors hover:text-ink-900"
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center bg-neabi-black font-display text-lg font-semibold text-neabi-cream"
          >
            {initial}
          </span>
          <span className="hidden max-w-[8rem] truncate font-sans text-[0.875rem] font-medium xl:block">
            {firstName(user)}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
          <span className="sr-only">Menu da conta</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[70] w-64 border border-border bg-surface p-1.5 shadow-overlay motion-safe:data-[state=open]:animate-fade-up"
        >
          <div className="mb-1 border-b border-border px-3 pb-3 pt-2">
            <p className="truncate font-sans text-[0.9375rem] font-semibold text-ink-900">
              {user.name ?? "Sua conta"}
            </p>
            <p className="truncate text-[0.8125rem] text-ink-500">{user.email}</p>
          </div>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/minha-conta">
              <User aria-hidden="true" className="size-4 text-ink-500" />
              Minha conta
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/minha-conta/reservas">
              <Calendar aria-hidden="true" className="size-4 text-ink-500" />
              Minhas reservas
            </Link>
          </DropdownMenu.Item>
          {user.isStaff ? (
            <DropdownMenu.Item asChild className={itemClass}>
              <Link href="/admin">
                <LayoutDashboard aria-hidden="true" className="size-4 text-ink-500" />
                Painel administrativo
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={itemClass} onSelect={onLogout}>
            <LogOut aria-hidden="true" className="size-4 text-ink-500" />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Menu de tela cheia (mobile)
// ---------------------------------------------------------------------------

function MobileMenu({
  user,
  pathname,
  isActive,
  onClose,
  onLogout,
}: {
  user: HeaderUser | null;
  pathname: string;
  isActive: (href: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const accountLinks = [
    { href: "/minha-conta", label: "Minha conta", icon: User },
    { href: "/minha-conta/reservas", label: "Minhas reservas", icon: Calendar },
    ...(user?.isStaff
      ? [{ href: "/admin", label: "Painel administrativo", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <>
      <div aria-hidden="true" className="neabi-rule h-1 w-full shrink-0" />
      <div
        aria-hidden="true"
        className="neabi-pattern pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.04]"
      />
      <Container className="relative flex h-[var(--header-height)] shrink-0 items-center justify-between">
        <Link href="/" onClick={onClose} aria-label="Biblioteca NEABI-NI — página inicial">
          <NeabiMark tone="dark" />
        </Link>
        <Dialog.Close asChild>
          <button
            type="button"
            className="-mr-2 flex size-11 items-center justify-center text-neabi-cream"
          >
            <X aria-hidden="true" className="size-6" />
            <span className="sr-only">Fechar menu</span>
          </button>
        </Dialog.Close>
      </Container>

      <Dialog.Title className="sr-only">Menu</Dialog.Title>

      <Container className="relative flex flex-1 flex-col pb-8 pt-4">
        <nav aria-label="Navegação principal">
          <ul className="border-t border-neabi-cream/15">
            {mainNavigation.map((item, index) => (
              <li key={item.href} className="border-b border-neabi-cream/15">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={onClose}
                  className="group flex min-h-[4.25rem] items-center gap-4 py-2"
                >
                  <span
                    aria-hidden="true"
                    className="w-6 font-sans text-[0.75rem] font-semibold tabular-nums text-neabi-amber"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "flex-1 font-display text-[2.25rem] font-semibold uppercase leading-none tracking-[0.01em]",
                      isActive(item.href) ? "text-neabi-cream" : "text-neabi-cream/80",
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive(item.href) ? (
                    <span aria-hidden="true" className="h-8 w-1 bg-neabi-red" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="size-5 text-neabi-cream/40" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <p className="eyebrow text-neabi-cream/55">
            {user ? `Olá, ${firstName(user)}` : "Sua conta"}
          </p>
          {user ? (
            <ul className="mt-3 flex flex-col">
              {accountLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={pathname === href ? "page" : undefined}
                    className="flex min-h-12 items-center gap-3 text-[1.0625rem] font-medium text-neabi-cream/85 transition-colors hover:text-neabi-cream"
                  >
                    <Icon aria-hidden="true" className="size-5 text-neabi-cream/50" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-neabi-cream/65">
              Entre para solicitar reservas presenciais e acompanhar seus pedidos.
              Consultar o acervo não exige cadastro.
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-10">
          {user ? (
            <Button variant="onDarkOutline" size="lg" className="w-full" onClick={onLogout}>
              <LogOut aria-hidden="true" />
              Sair
            </Button>
          ) : (
            <Button asChild variant="onDark" size="lg" className="w-full">
              <Link href="/login" onClick={onClose}>
                Entrar
              </Link>
            </Button>
          )}
          <Button asChild variant="onDarkOutline" size="lg" className="w-full">
            <Link href="/acervo" onClick={onClose}>
              <BookOpen aria-hidden="true" />
              Explorar o acervo
            </Link>
          </Button>
          <p className="mt-4 text-center text-[0.75rem] uppercase tracking-[0.14em] text-neabi-cream/45">
            CEFET/RJ · Campus Nova Iguaçu
          </p>
        </div>
      </Container>
    </>
  );
}
