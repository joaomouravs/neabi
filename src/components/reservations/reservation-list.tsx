import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { shiftLabels } from "@/config/catalog";
import { formatDate, formatDateTime } from "@/lib/date";
import type { ReservationListItem } from "@/server/repositories/reservation-repository";

/**
 * Lista de reservas da pessoa usuária.
 *
 * Cada item mostra o que ela realmente precisa saber de relance: protocolo,
 * obra, situação, quando pediu e para quando pediu.
 */
export function ReservationList({
  reservations,
}: {
  reservations: ReservationListItem[];
}) {
  return (
    <ul className="flex flex-col gap-px bg-border">
      {reservations.map((reservation) => (
        <li key={reservation.id}>
          <Link
            href={`/minha-conta/reservas/${reservation.id}`}
            className="group flex gap-4 bg-background p-4 transition-colors hover:bg-surface-muted sm:gap-5 sm:p-5"
          >
            <div className="w-16 shrink-0 sm:w-20">
              <BookCover
                title={reservation.book.title}
                coverImage={reservation.book.coverImage}
                coverAlt={reservation.book.coverAlt}
                sizes="80px"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-mono text-[0.75rem] text-ink-500">
                  {reservation.protocol}
                </span>
                <ReservationStatusBadge status={reservation.status} size="sm" />
              </div>

              <h3 className="text-pretty font-display text-[1.0625rem] font-semibold leading-tight text-ink-900 group-hover:text-neabi-red-700 sm:text-lg">
                {reservation.book.title}
              </h3>

              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-ink-500">
                <div className="flex gap-1.5">
                  <dt>Data solicitada:</dt>
                  <dd className="text-ink-700">
                    {formatDate(reservation.requestedDate)} ·{" "}
                    {shiftLabels[reservation.shift]}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Atualizada em:</dt>
                  <dd className="text-ink-700">
                    {formatDateTime(reservation.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <span
              aria-hidden="true"
              className="hidden self-center text-ink-300 transition-colors group-hover:text-neabi-red sm:block"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
