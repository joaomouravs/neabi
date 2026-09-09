import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Blocos do painel administrativo.
 *
 * Tabelas rolam dentro do próprio contêiner (`overflow-x-auto`), então a
 * página nunca rola na horizontal — regra que vale em qualquer largura.
 */

export function AdminPage({
  title,
  description,
  action,
  breadcrumb,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  breadcrumb?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      {breadcrumb ? (
        <nav aria-label="Trilha de navegação" className="mb-4">
          <Link
            href={breadcrumb.href}
            className="text-[0.8125rem] text-ink-500 underline underline-offset-4 hover:text-ink-900"
          >
            ← {breadcrumb.label}
          </Link>
        </nav>
      ) : null}

      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight text-ink-900">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      <div className="mt-8">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "neutral" | "amber" | "green" | "red";
}) {
  const accent = {
    neutral: "border-t-ink-300",
    amber: "border-t-neabi-amber",
    green: "border-t-neabi-green",
    red: "border-t-neabi-red",
  }[tone];

  const content = (
    <div
      className={cn(
        "flex h-full flex-col justify-between border border-border border-t-2 bg-surface p-4",
        accent,
        href && "transition-colors hover:bg-surface-muted",
      )}
    >
      <p className="font-sans text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p className="mt-3 font-display text-[2.25rem] font-bold leading-none tabular-nums text-ink-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-500">{hint}</p>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
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
          <tr className="border-b border-border bg-surface-muted">{head}</tr>
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
        "px-4 py-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-500",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-[0.875rem] text-ink-800", className)}
      {...props}
    />
  );
}

export function AdminSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-border bg-surface", className)}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-600">
            {description}
          </p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
