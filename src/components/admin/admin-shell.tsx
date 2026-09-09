"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { logoutAction } from "@/features/auth/actions";
import { NeabiMark } from "@/components/layout/neabi-mark";
import { adminNavigation } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Casca do painel administrativo.
 *
 * Densidade acima de espetáculo: a equipe do NEABI passa o tempo em tabelas e
 * formulários, então priorizamos leitura, alcance dos controles e navegação
 * rápida. Nada de decoração que atrapalhe o trabalho.
 */
export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string | null; roleLabel: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#admin-conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-[100] bg-neabi-black px-4 py-3 text-sm font-semibold text-neabi-cream"
      >
        Pular para o conteúdo
      </a>

      <header className="flex items-center justify-between gap-3 border-b border-ink-700 bg-neabi-black px-4 py-3 lg:hidden">
        <Link href="/admin">
          <NeabiMark tone="dark" showSubtitle={false} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="flex size-11 items-center justify-center text-neabi-cream"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            {open ? "×" : "≡"}
          </span>
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
        </button>
      </header>

      <nav
        id="admin-nav"
        aria-label="Navegação administrativa"
        className={cn(
          "shrink-0 border-ink-700 bg-neabi-black lg:block lg:w-60 lg:border-r",
          open ? "block border-b" : "hidden",
        )}
      >
        <div className="hidden px-5 py-5 lg:block">
          <Link href="/admin">
            <NeabiMark tone="dark" showSubtitle={false} />
          </Link>
          <p className="mt-2 font-sans text-[0.625rem] uppercase tracking-[0.14em] text-neabi-amber">
            Painel administrativo
          </p>
        </div>

        <ul className="flex flex-col gap-0.5 px-3 py-3 lg:py-0">
          {adminNavigation.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={
                  isActive(item.href, "exact" in item ? item.exact : undefined)
                    ? "page"
                    : undefined
                }
                className={cn(
                  "flex min-h-10 items-center px-3 font-sans text-[0.875rem] transition-colors",
                  isActive(item.href, "exact" in item ? item.exact : undefined)
                    ? "bg-neabi-cream/10 font-semibold text-neabi-cream"
                    : "text-neabi-cream/65 hover:bg-neabi-cream/5 hover:text-neabi-cream",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-ink-700 px-6 py-5">
          <p className="font-sans text-[0.8125rem] font-medium text-neabi-cream">
            {user.name ?? "Equipe NEABI"}
          </p>
          <p className="mt-0.5 font-sans text-[0.75rem] text-neabi-cream/50">
            {user.roleLabel}
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <Link
              href="/"
              className="font-sans text-[0.8125rem] text-neabi-cream/70 underline underline-offset-4 hover:text-neabi-cream"
            >
              Ver o site público
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-sans text-[0.8125rem] text-neabi-cream/70 underline underline-offset-4 hover:text-neabi-amber"
              >
                Sair da conta
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main id="admin-conteudo" className="min-w-0 flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}
