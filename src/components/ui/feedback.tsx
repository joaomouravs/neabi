import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ComponentProps, ElementType, ReactNode } from "react";

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

/** Região de carregamento com anúncio para leitores de tela. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <LoadingRegion
      label="Carregando registros…"
      className="flex flex-col gap-px border border-border bg-border"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 bg-surface px-4 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </LoadingRegion>
  );
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * Estado vazio útil: diz o que aconteceu e oferece a próxima ação.
 * Nunca uma tela em branco nem um "nada aqui" sem saída.
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
  headingLevel = 3,
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as ElementType;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden border border-border bg-surface px-6 py-14 text-center sm:py-16",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="neabi-rule absolute inset-x-0 top-0 h-1"
      />
      <div
        aria-hidden="true"
        className="relative mb-6 flex size-16 items-center justify-center bg-surface-muted text-ink-700"
      >
        <span className="neabi-pattern-diamonds absolute inset-0 text-ink-300 opacity-25" />
        {Icon ? (
          <Icon className="relative size-6" strokeWidth={1.75} />
        ) : (
          <span className="relative h-1 w-6 bg-neabi-red" />
        )}
      </div>
      <Heading className="text-balance font-display text-[1.75rem] font-semibold leading-tight text-ink-900">
        {title}
      </Heading>
      {description ? (
        <div className="mt-2.5 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-ink-600">
          {description}
        </div>
      ) : null}
      {action ? (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------

const alertVariants = cva(
  "flex gap-3 border-l-4 px-4 py-3.5 text-[0.9375rem] leading-relaxed",
  {
    variants: {
      variant: {
        info: "border-l-ink-400 bg-neabi-cream-100 text-ink-800",
        success: "border-l-neabi-green bg-neabi-green-050 text-neabi-green-900",
        warning: "border-l-neabi-amber bg-neabi-amber-050 text-neabi-amber-900",
        danger: "border-l-neabi-red bg-neabi-red-050 text-neabi-red-900",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const ALERT_ICONS: Record<"info" | "success" | "warning" | "danger", LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: TriangleAlert,
};

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
  const Icon = ALERT_ICONS[variant ?? "info"];

  return (
    <div
      // Mensagens de erro e sucesso precisam ser anunciadas quando surgem.
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-[1.125rem] shrink-0" strokeWidth={2} />
      <div className="min-w-0">
        {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
