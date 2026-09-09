import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Estados compartilhados por todo componente assíncrono:
 * carregando, vazio, erro e aviso.
 */

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      // Decorativo: o texto de carregamento fica no contêiner com aria-live.
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-neabi-cream-200/80 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/** Esqueleto de um card de obra, na mesma proporção do conteúdo real. */
export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export function BookGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
    >
      <span className="sr-only">Carregando obras do acervo…</span>
      {Array.from({ length: count }, (_, index) => (
        <BookCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-px bg-border">
      <span className="sr-only">Carregando registros…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 bg-surface px-4 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center border border-dashed border-border-strong px-6 py-16 text-center",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="neabi-pattern-diamonds mb-6 h-6 w-24 text-ink-300 opacity-60"
      />
      <h3 className="font-display text-2xl font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------

const alertVariants = cva("border-l-4 px-4 py-3.5 text-[0.9375rem] leading-relaxed", {
  variants: {
    variant: {
      info: "border-l-ink-400 bg-neabi-cream-100 text-ink-800",
      success: "border-l-neabi-green bg-neabi-green-050 text-neabi-green-900",
      warning: "border-l-neabi-amber bg-neabi-amber-050 text-neabi-amber-900",
      danger: "border-l-neabi-red bg-neabi-red-050 text-neabi-red-900",
    },
  },
  defaultVariants: { variant: "info" },
});

export interface AlertProps
  extends ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  title?: string;
}

export function Alert({
  className,
  variant,
  title,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      // Mensagens de erro e sucesso precisam ser anunciadas quando surgem.
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
