"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BookCopy,
  CalendarCheck,
  ChartColumn,
  ExternalLink,
  FolderOpen,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Settings,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { logoutAction } from "@/features/auth/actions";
import { NeabiMark } from "@/components/layout/neabi-mark";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  showsPending?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Painel",
    items: [{ href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Acervo",
    items: [
      { href: "/admin/acervo", label: "Acervo", icon: Library },
      { href: "/admin/exemplares", label: "Exemplares", icon: BookCopy },
      { href: "/admin/categorias", label: "Categorias", icon: Tags },
      { href: "/admin/arquivos", label: "Arquivos", icon: FolderOpen },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { href: "/admin/reservas", label: "Reservas", icon: CalendarCheck, showsPending: true },
      { href: "/admin/usuarios", label: "Usuários", icon: Users },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: ChartColumn },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export interface AdminShellUser {
  name: string | null;
  roleLabel: string;
}

/**
 * Casca do painel administrativo.
 *
 * Densidade acima de espetáculo: a equipe do NEABI passa o tempo em tabelas e
 * formulários, então priorizamos leitura, alcance dos controles e navegação
 * rápida. No celular, a navegação vai para uma gaveta com foco preso — as
 * operações essenciais continuam alcançáveis sem quebrar o layout.
 */
export function AdminShell({
  children,
  user,
  pendingReservations,
}: {
  children: ReactNode;
  user: AdminShellUser;
  pendingReservations: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#admin-conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-[100] bg-neabi-black px-4 py-3 text-sm font-semibold text-neabi-cream"
      >
        Pular para o conteúdo
      </a>

      <aside className="on-dark hidden lg:block">
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto bg-neabi-black text-neabi-cream">
          <SidebarContent pathname={pathname} user={user} pending={pendingReservations} />
        </div>
      </aside>

      <header className="on-dark sticky top-0 z-40 flex h-14 items-center justify-between gap-3 bg-neabi-black px-4 text-neabi-cream lg:hidden">
        <Link href="/admin" aria-label="Painel administrativo — visão geral">
          <NeabiMark tone="dark" showSubtitle={false} size="sm" />
        </Link>

        <div className="flex items-center gap-1">
          {pendingReservations > 0 ? (
            <Link
              href="/admin/reservas?status=PENDING"
              className="inline-flex h-8 items-center gap-1.5 bg-neabi-amber px-2 font-sans text-[0.75rem] font-bold tabular-nums text-ink-900"
            >
              <CalendarCheck aria-hidden="true" className="size-3.5" />
              {pendingReservations}
              <span className="sr-only">
                {pendingReservations === 1 ? " reserva pendente" : " reservas pendentes"}
              </span>
            </Link>
          ) : null}

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="flex size-11 items-center justify-center text-neabi-cream">
                <Menu aria-hidden="true" className="size-6" />
                <span className="sr-only">Abrir menu do painel</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-neabi-black/60 motion-safe:animate-fade-in lg:hidden" />
              <Dialog.Content
                aria-describedby={undefined}
                className="on-dark fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col overflow-y-auto bg-neabi-black text-neabi-cream shadow-overlay motion-safe:animate-fade-in lg:hidden"
              >
                <Dialog.Title className="sr-only">Menu do painel administrativo</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute right-2 top-3 z-10 flex size-11 items-center justify-center text-neabi-cream"
                  >
                    <X aria-hidden="true" className="size-5" />
                    <span className="sr-only">Fechar menu</span>
                  </button>
                </Dialog.Close>
                <SidebarContent
                  pathname={pathname}
                  user={user}
                  pending={pendingReservations}
                  onNavigate={() => setOpen(false)}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>

      <main id="admin-conteudo" tabIndex={-1} className="min-w-0 focus:outline-none">
        {children}
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  user,
  pending,
  onNavigate,
}: {
  pathname: string;
  user: AdminShellUser;
  pending: number;
  onNavigate?: () => void;
}) {
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const initial = (user.name?.trim() || "N").charAt(0).toUpperCase();

  return (
    <>
      <div aria-hidden="true" className="neabi-rule h-1 w-full shrink-0" />
      <div className="px-5 pb-3 pt-5">
        <Link href="/admin" onClick={onNavigate} aria-label="Painel administrativo — visão geral">
          <NeabiMark tone="dark" showSubtitle={false} size="sm" />
        </Link>
        <p className="eyebrow mt-2.5 text-neabi-amber">Painel administrativo</p>
      </div>

      <nav aria-label="Navegação administrativa" className="flex-1 px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-4">
            <p className="px-3 pb-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-neabi-cream/45">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 px-3 font-sans text-[0.875rem] transition-colors duration-150",
                        active
                          ? "bg-neabi-cream/10 font-semibold text-neabi-cream"
                          : "text-neabi-cream/70 hover:bg-neabi-cream/5 hover:text-neabi-cream",
                      )}
                    >
                      {active ? (
                        <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-[3px] bg-neabi-red" />
                      ) : null}
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-neabi-amber" : "text-neabi-cream/50 group-hover:text-neabi-cream/80",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.showsPending && pending > 0 ? (
                        <span className="min-w-5 bg-neabi-amber px-1.5 text-center text-[0.6875rem] font-bold leading-5 tabular-nums text-ink-900">
                          {pending}
                          <span className="sr-only">{pending === 1 ? " pendente" : " pendentes"}</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-neabi-cream/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center bg-neabi-cream/10 font-display text-lg font-semibold"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-sans text-[0.8125rem] font-semibold">
              {user.name ?? "Equipe NEABI"}
            </p>
            <p className="truncate font-sans text-[0.75rem] text-neabi-cream/55">{user.roleLabel}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col">
          <Link
            href="/"
            className="flex min-h-9 items-center gap-2.5 font-sans text-[0.8125rem] text-neabi-cream/70 transition-colors hover:text-neabi-cream"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Ver o site público
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-9 items-center gap-2.5 font-sans text-[0.8125rem] text-neabi-cream/70 transition-colors hover:text-neabi-amber"
            >
              <LogOut aria-hidden="true" className="size-3.5" />
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
