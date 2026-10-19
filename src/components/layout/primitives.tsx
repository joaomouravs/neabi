import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Estruturas de página compartilhadas.
 *
 * O produto é editorial: a medida do texto, o ritmo vertical e o alinhamento
 * das seções vêm daqui, não de valores avulsos espalhados pelas telas.
 */

/**
 * Contêiner de página.
 *
 * Laterais de 20px no celular e 32px a partir do tablet; no desktop o conteúdo
 * para em 1280px e nunca se espalha por uma tela de 1920px.
 */
export function Container({
  className,
  as: Component = "div",
  size = "default",
  ...props
}: ComponentProps<"div"> & {
  as?: ElementType;
  size?: "default" | "wide" | "narrow" | "prose";
}) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-5 md:px-8",
        size === "prose" && "max-w-184",
        size === "narrow" && "max-w-4xl",
        size === "default" && "max-w-7xl",
        size === "wide" && "max-w-360",
        className,
      )}
      {...props}
    />
  );
}

/** Faixa tricolor institucional, usada como divisor editorial. */
export function NeabiRule({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("neabi-rule h-1 w-16", className)}
      {...props}
    />
  );
}

/** Sobretítulo com um traço curto à esquerda. */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "eyebrow flex items-center gap-2.5",
        tone === "dark" ? "text-neabi-amber" : "text-neabi-red-600",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-6 shrink-0 bg-current" />
      {children}
    </p>
  );
}

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2 | 3;
  size?: "md" | "lg";
  tone?: "light" | "dark";
  id?: string;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  level = 2,
  size = "md",
  tone = "light",
  id,
  className,
}: SectionHeadingProps) {
  const Heading = `h${level}` as ElementType;
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <Eyebrow tone={tone} className="mb-3">
            {eyebrow}
          </Eyebrow>
        ) : null}
        <Heading
          id={id}
          className={cn(
            "text-balance font-display font-bold",
            level === 1
              ? "text-display-lg"
              : size === "lg"
                ? "text-display-md"
                : "text-display-sm",
            dark ? "text-neabi-cream" : "text-ink-900",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <div
            className={cn(
              "mt-4 text-pretty text-base leading-relaxed sm:text-[1.0625rem]",
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

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

/**
 * Trilha de navegação.
 *
 * O último item é a página atual (`aria-current`) e é truncado em uma linha:
 * títulos de obra passam de cem caracteres e não podem empurrar o layout.
 */
export function Breadcrumbs({
  items,
  tone = "light",
  className,
}: {
  items: BreadcrumbItem[];
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";

  return (
    <nav aria-label="Trilha de navegação" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem]">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className={cn("flex min-w-0 items-center gap-1.5", last && "max-w-full")}
            >
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 shrink-0",
                    dark ? "text-neabi-cream/40" : "text-ink-400",
                  )}
                />
              ) : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={cn(
                    "link-reveal whitespace-nowrap",
                    dark
                      ? "text-neabi-cream/70 hover:text-neabi-cream"
                      : "text-ink-600 hover:text-ink-900",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "line-clamp-1 max-w-[min(32rem,70vw)] font-medium",
                    dark ? "text-neabi-cream" : "text-ink-800",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Cabeçalho das páginas internas.
 *
 * Fundo creme com pautas finas à direita — presença da identidade sem
 * competir com o título. `children` ocupa a coluna lateral no desktop
 * (números, atalhos, ações).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        dark
          ? "on-dark bg-neabi-black text-neabi-cream"
          : "border-b border-border bg-surface-muted",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 mask-[linear-gradient(to_left,black,transparent)] md:block",
          dark
            ? "neabi-pattern text-neabi-cream opacity-[0.06]"
            : "neabi-pattern-lines text-ink-900 opacity-[0.045]",
        )}
      />
      <Container className="section-y-sm relative">
        {breadcrumbs ? (
          <Breadcrumbs items={breadcrumbs} tone={tone} className="mb-7" />
        ) : null}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="min-w-0 max-w-3xl">
            {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
            <h1
              className={cn(
                "mt-3 text-balance font-display text-display-lg font-bold",
                dark ? "text-neabi-cream" : "text-ink-900",
              )}
            >
              {title}
            </h1>
            <NeabiRule className="mt-6" />
            {description ? (
              <div
                className={cn(
                  "mt-5 max-w-2xl text-pretty text-lede",
                  dark ? "text-neabi-cream/75" : "text-ink-600",
                )}
              >
                {description}
              </div>
            ) : null}
          </div>
          {children ? <div className="min-w-0 lg:max-w-sm lg:shrink-0">{children}</div> : null}
        </div>
      </Container>
    </section>
  );
}

/**
 * Lista de metadados bibliográficos.
 * Campos ausentes não são renderizados — nunca aparece "não informado" onde a
 * catalogação ainda não foi feita.
 */
/**
 * `stacked` põe o rótulo acima do valor — para colunas laterais estreitas, onde
 * a coluna de 10rem do rótulo deixaria um e-mail quebrando no meio.
 */
export function MetadataList({
  items,
  className,
  stacked = false,
}: {
  items: { label: string; value: ReactNode | null | undefined }[];
  className?: string;
  stacked?: boolean;
}) {
  const visible = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== "",
  );
  if (visible.length === 0) return null;

  return (
    <dl className={cn("flex flex-col", className)}>
      {visible.map((item) => (
        <div
          key={item.label}
          className={cn(
            "grid gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0",
            !stacked && "sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6",
          )}
        >
          <dt className="font-sans text-[0.75rem] font-semibold uppercase tracking-widest text-ink-500 sm:pt-0.5">
            {item.label}
          </dt>
          <dd className="min-w-0 wrap-break-word text-[0.9375rem] leading-relaxed text-ink-800">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
