import { BookCard } from "@/components/books/book-card";
import type { BookCardRecord } from "@/server/repositories/book-repository";
import { cn } from "@/lib/utils";

/**
 * Grades de obras.
 *
 * `catalog` convive com a coluna de filtros (3 colunas no desktop médio, 4 a
 * partir de 1280px); `wide` ocupa a largura inteira do contêiner. Abaixo de
 * 480px as duas viram lista, com o cartão em layout horizontal.
 */
export const BOOK_GRID_CLASSES = {
  catalog:
    "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[480px]:gap-x-4 min-[480px]:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4",
  wide: "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[480px]:gap-x-4 min-[480px]:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 lg:gap-x-6",
} as const;

export function BookGrid({
  books,
  variant = "wide",
  priorityCount = 0,
  headingLevel = 3,
  className,
}: {
  books: BookCardRecord[];
  variant?: keyof typeof BOOK_GRID_CLASSES;
  priorityCount?: number;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <ul className={cn(BOOK_GRID_CLASSES[variant], className)}>
      {books.map((book, index) => (
        <li key={book.id} className="min-w-0">
          <BookCard
            book={book}
            priority={index < priorityCount}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  );
}
