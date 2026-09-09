import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Paginação do acervo.
 *
 * Links reais (`<a href>`): indexáveis, abríveis em nova aba e utilizáveis sem
 * JavaScript. O número da página atual é anunciado por `aria-current`.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Paginação dos resultados"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        label="Página anterior"
      >
        <span aria-hidden="true">‹</span>
      </PageLink>

      <ul className="flex items-center gap-1.5">
        {pages.map((entry, index) =>
          entry === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-ink-400"
            >
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={buildHref(entry)}
                scroll={false}
                aria-current={entry === page ? "page" : undefined}
                aria-label={`Página ${entry}`}
                className={cn(
                  "flex min-h-10 min-w-10 items-center justify-center border px-2 font-sans text-[0.875rem] font-medium tabular-nums transition-colors",
                  entry === page
                    ? "border-neabi-black bg-neabi-black text-neabi-cream"
                    : "border-ink-900/20 text-ink-700 hover:border-ink-900/45 hover:text-ink-900",
                )}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ul>

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        label="Próxima página"
      >
        <span aria-hidden="true">›</span>
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes =
    "flex min-h-10 min-w-10 items-center justify-center border border-ink-900/20 px-2 text-lg leading-none";

  if (disabled) {
    return (
      <span aria-hidden="true" className={cn(classes, "text-ink-300")}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className={cn(classes, "text-ink-700 transition-colors hover:border-ink-900/45 hover:text-ink-900")}
    >
      {children}
    </Link>
  );
}

/** Janela de páginas com reticências: 1 … 4 5 6 … 20. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const result: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) result.push("gap");
  for (let current = start; current <= end; current += 1) result.push(current);
  if (end < totalPages - 1) result.push("gap");
  result.push(totalPages);

  return result;
}
