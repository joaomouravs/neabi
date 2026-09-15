import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Paginação do acervo.
 *
 * Links reais (`<a href>`): indexáveis, abríveis em nova aba e utilizáveis sem
 * JavaScript. O número da página atual é anunciado por `aria-current`. No
 * celular, a janela de números encolhe e "anterior/próxima" ficam com rótulo.
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
      className={cn("flex flex-col items-center gap-3", className)}
    >
      <div className="flex items-center gap-1.5">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Página anterior">
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Anterior</span>
        </PageLink>

        <ul className="flex items-center gap-1">
          {pages.map((entry, index) =>
            entry === "gap" ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-500">
                …
              </li>
            ) : (
              <li key={entry}>
                <Link
                  href={buildHref(entry)}
                  aria-current={entry === page ? "page" : undefined}
                  aria-label={`Página ${entry}`}
                  className={cn(
                    "flex min-h-11 min-w-11 items-center justify-center border px-2 font-sans text-[0.875rem] font-medium tabular-nums transition-colors",
                    entry === page
                      ? "border-neabi-black bg-neabi-black text-neabi-cream"
                      : "border-transparent text-ink-700 hover:border-ink-900/25 hover:text-ink-900",
                  )}
                >
                  {entry}
                </Link>
              </li>
            ),
          )}
        </ul>

        <PageLink href={buildHref(page + 1)} disabled={page >= totalPages} label="Próxima página">
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </PageLink>
      </div>
      <p className="text-[0.8125rem] text-ink-500">
        Página {page} de {totalPages}
      </p>
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
    "flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-ink-900/20 px-3 font-sans text-[0.875rem] font-medium";

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
      aria-label={label}
      className={cn(classes, "text-ink-800 transition-colors hover:border-ink-900 hover:text-ink-900")}
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
