import { BOOK_GRID_CLASSES } from "@/components/books/book-grid";
import { Container } from "@/components/layout/primitives";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

/**
 * Esqueletos com a mesma geometria do conteúdo final.
 *
 * Nenhum spinner central: quem espera vê a forma da página chegando, e nada
 * pula de lugar quando os dados substituem o esqueleto.
 */

export function BookCardSkeleton() {
  return (
    <div className="flex h-full flex-row border border-border bg-surface min-[480px]:flex-col">
      <Skeleton className="aspect-3/4 w-22 shrink-0 self-start min-[480px]:w-full" />
      <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5 min-[480px]:p-4 lg:p-5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-auto h-3 w-28" />
      </div>
    </div>
  );
}

export function BookGridSkeleton({
  count = 8,
  variant = "wide",
}: {
  count?: number;
  variant?: keyof typeof BOOK_GRID_CLASSES;
}) {
  return (
    <LoadingRegion label="Carregando obras do acervo…">
      <ul className={BOOK_GRID_CLASSES[variant]}>
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <BookCardSkeleton />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** Página da obra: capa, ficha e cartão de disponibilidade. */
export function BookDetailsSkeleton() {
  return (
    <LoadingRegion label="Carregando a obra…">
      <Container className="pt-6">
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </Container>
      <Container className="section-y-sm">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_20rem] lg:gap-12">
          <Skeleton className="mx-auto aspect-3/4 w-full max-w-60 lg:max-w-none" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <div className="mt-6 flex flex-col gap-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </Container>
    </LoadingRegion>
  );
}

/** Formulário de reserva com o resumo da obra ao lado. */
export function ReservationSkeleton() {
  return (
    <LoadingRegion label="Carregando o formulário de reserva…">
      <Container className="section-y-sm">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="mt-6 h-12 w-80 max-w-full" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            {Array.from({ length: 3 }, (_, section) => (
              <div key={section} className="border border-border bg-surface p-6">
                <Skeleton className="h-6 w-48" />
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="order-1 h-40 w-full lg:order-2 lg:h-96" />
        </div>
      </Container>
    </LoadingRegion>
  );
}

/** Lista de reservas da conta. */
export function AccountReservationsSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <LoadingRegion label="Carregando suas reservas…" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-4 border border-border bg-surface p-4 sm:p-5">
          <Skeleton className="aspect-3/4 w-16 shrink-0 sm:w-20" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}
