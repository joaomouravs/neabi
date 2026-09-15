import { AccountReservationsSkeleton } from "@/components/books/book-skeletons";
import { Skeleton } from "@/components/ui/feedback";

/** Carregamento das páginas da conta — o cabeçalho vem do layout. */
export default function AccountLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
      <AccountReservationsSkeleton />
    </div>
  );
}
