import type { ComponentProps, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Estruturas de página compartilhadas.
 *
 * O produto é editorial: a medida do texto, o ritmo vertical e o alinhamento
 * das seções vêm daqui, não de valores avulsos espalhados pelas telas.
 */

export function Container({
  className,
  as: Component = "div",
  size = "default",
  ...props
}: ComponentProps<"div"> & {
  as?: ElementType;
  size?: "default" | "wide" | "narrow";
}) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-[1180px]",
        size === "wide" && "max-w-[1400px]",
        className,
      )}
      {...props}
    />
  );
}

/** Faixa tricolor institucional, usada como divisor editorial. */
export function NeabiRule({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("neabi-rule h-1 w-16", className)}
      {...props}
    />
  );
}

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2 | 3;
  tone?: "light" | "dark";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  level = 2,
  tone = "light",
  className,
}: SectionHeadingProps) {
  const Heading = `h${level}` as ElementType;
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p
            className={cn(
              "mb-2.5 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.16em]",
              dark ? "text-neabi-amber" : "text-neabi-red-600",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <Heading
          className={cn(
            "text-balance font-display font-bold",
            level === 1
              ? "text-[clamp(2.5rem,7vw,4.5rem)]"
              : "text-[clamp(1.75rem,4vw,2.75rem)]",
            dark ? "text-neabi-cream" : "text-ink-900",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <div
            className={cn(
              "mt-3 text-pretty text-base leading-relaxed sm:text-[1.0625rem]",
              dark ? "text-neabi-cream/75" : "text-ink-600",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Lista de metadados bibliográficos.
 * Campos ausentes não são renderizados — nunca aparece "não informado" onde a
 * catalogação ainda não foi feita.
 */
export function MetadataList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode | null | undefined }[];
  className?: string;
}) {
  const visible = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== "",
  );
  if (visible.length === 0) return null;

  return (
    <dl className={cn("grid gap-x-8 gap-y-3.5 sm:grid-cols-[auto_1fr]", className)}>
      {visible.map((item) => (
        <div key={item.label} className="contents">
          <dt className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:pt-0.5">
            {item.label}
          </dt>
          <dd className="text-[0.9375rem] leading-relaxed text-ink-800 sm:mt-0">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
