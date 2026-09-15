import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { shiftLabels } from "@/config/catalog";
import { formatDate, formatDateTime } from "@/lib/date";
import type { ReservationListItem } from "@/server/repositories/reservation-repository";

/**
 * Lista de reservas da pessoa usuária.
 *
 * Cada item mostra o que ela precisa saber de relance: capa, obra, protocolo,
 * situação, para quando pediu — e leva aos detalhes.
 */
export function ReservationList({ reservations }: { reservations: ReservationListItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {reservations.map((reservation) => (
        <li key={reservation.id}>
          <Link
            href={`/minha-conta/reservas/${reservation.id}`}
            className="group flex gap-4 border border-border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-200 ease-editorial hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card motion-reduce:hover:translate-y-0 sm:gap-6 sm:p-5"
          >
            <div className="w-16 shrink-0 sm:w-20">
              <BookCover
                title={reservation.book.title}
                coverImage={reservation.book.coverImage}
                coverAlt={reservation.book.coverAlt}
                sizes="80px"
                decorative
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <ReservationStatusBadge status={reservation.status} size="sm" />
                <span className="font-mono text-[0.75rem] text-ink-500">{reservation.protocol}</span>
              </div>

              <h3 className="mt-2 text-pretty font-display text-[1.25rem] font-semibold leading-tight text-ink-900 transition-colors group-hover:text-neabi-red-700 sm:text-[1.375rem]">
                {reservation.book.title}
              </h3>

              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-ink-500">
                <div className="flex gap-1.5">
                  <dt>Data solicitada:</dt>
                  <dd className="text-ink-800">
                    {formatDate(reservation.requestedDate)} · {shiftLabels[reservation.shift]}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Atualizada em:</dt>
                  <dd className="text-ink-800">{formatDateTime(reservation.updatedAt)}</dd>
                </div>
              </dl>

              <span
                aria-hidden="true"
                className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[0.8125rem] font-semibold text-ink-800 transition-colors group-hover:text-neabi-red-700"
              >
                Ver detalhes
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
