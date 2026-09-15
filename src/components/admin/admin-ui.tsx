import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Blocos do painel administrativo.
 *
 * A mesma identidade do site, com densidade de ferramenta de trabalho: menos
 * respiro editorial, mais informação por tela. Tabelas rolam dentro do próprio
 * contêiner (`overflow-x-auto`), então a página nunca rola na horizontal.
 */

/** Link de ação em tabelas e listas ("Editar", "Abrir"). */
export const adminLinkClass =
  "font-sans text-[0.8125rem] font-semibold text-neabi-red-700 underline decoration-1 underline-offset-4 transition-colors hover:text-neabi-red-900";

export function AdminPage({
  title,
  eyebrow,
  description,
  action,
  breadcrumb,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  action?: ReactNode;
  breadcrumb?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-5 pb-16 pt-6 sm:px-8 sm:pt-8 lg:px-10">
      {breadcrumb ? (
        <nav aria-label="Trilha de navegação" className="mb-3">
          <Link
            href={breadcrumb.href}
            className="group inline-flex min-h-9 items-center gap-1.5 text-[0.8125rem] font-medium text-ink-600 transition-colors hover:text-ink-900"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
            />
            {breadcrumb.label}
          </Link>
        </nav>
      ) : null}

      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <p className="eyebrow mb-1.5 text-neabi-red-600">{eyebrow}</p> : null}
          <h1 className="break-words font-display text-[clamp(1.875rem,3vw,2.5rem)] font-bold leading-tight text-ink-900">
            {title}
          </h1>
          {description ? (
            <div className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">{description}</div>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </header>

      <div className="mt-6 sm:mt-8">{children}</div>
    </div>
  );
}

const STAT_ACCENT = {
  neutral: "before:bg-ink-300",
  amber: "before:bg-neabi-amber",
  green: "before:bg-neabi-green",
  red: "before:bg-neabi-red",
} as const;

/**
 * Indicador numérico. O valor fica sempre logo abaixo do rótulo — com ou sem
 * dica —, então os números se alinham entre cartões da mesma linha.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: keyof typeof STAT_ACCENT;
}) {
  const content = (
    <div
      className={cn(
        "relative flex h-full flex-col border border-border bg-surface p-4 before:absolute before:inset-x-0 before:top-0 before:h-0.5 sm:p-5",
        STAT_ACCENT[tone],
        href && "transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-[0.75rem] font-semibold uppercase leading-snug tracking-[0.08em] text-ink-600">
          {label}
        </p>
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-400" /> : null}
      </div>
      <p className="mt-3 font-display text-[2.25rem] font-bold leading-none tabular-nums text-ink-900">
        {value}
      </p>
      {hint ? <p className="mt-2 text-[0.75rem] leading-snug text-ink-500">{hint}</p> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/**
 * Abas de filtro por situação.
 *
 * Links reais (a URL é o estado), com contagem opcional. No celular viram uma
 * trilha rolável de uma linha — nove status não podem ocupar quatro linhas
 * antes da tabela.
 */
export function AdminFilterTabs({
  label,
  items,
}: {
  label: string;
  items: {
    href: string;
    label: string;
    active: boolean;
    count?: number;
    tone?: "amber";
  }[];
}) {
  return (
    <nav aria-label={label} className="-mx-5 sm:mx-0">
      <ul className="scrollbar-none relative flex gap-2 overflow-x-auto px-5 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {items.map((item) => (
          <li key={item.href + item.label} className="shrink-0">
            <Link
              href={item.href}
              aria-current={item.active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 whitespace-nowrap border px-3 font-sans text-[0.8125rem] font-medium transition-colors duration-150",
                item.active
                  ? item.tone === "amber"
                    ? "border-neabi-amber-700 bg-neabi-amber-050 text-neabi-amber-900"
                    : "border-neabi-black bg-neabi-black text-neabi-cream"
                  : "border-ink-900/15 bg-surface text-ink-700 hover:border-ink-900/40 hover:text-ink-900",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "tabular-nums",
                    item.active && item.tone !== "amber" ? "text-neabi-cream/70" : "text-ink-500",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdminTable({
  head,
  children,
  caption,
}: {
  head: ReactNode;
  children: ReactNode;
  caption?: string;
}) {
  return (
    // `relative` dá ao contêiner um contexto de posicionamento. Sem ele, um
    // descendente absoluto — a legenda `.sr-only` ou um rótulo oculto dentro de
    // `Th` — escapa do recorte de `overflow-x-auto` e alarga a rolagem
    // horizontal da página inteira.
    <div className="relative overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[42rem] border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border-strong bg-surface-muted">{head}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-600",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 py-3.5 align-middle text-[0.875rem] text-ink-800", className)}
      {...props}
    />
  );
}

export function AdminSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 border border-border bg-surface", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight text-ink-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-600">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Estado vazio compacto para dentro de seções e painéis. */
export function AdminEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon ? (
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center bg-surface-muted text-ink-600">
          <Icon className="size-4" />
        </span>
      ) : null}
      <div>
        <p className="font-sans text-[0.9375rem] font-semibold text-ink-900">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-600">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
