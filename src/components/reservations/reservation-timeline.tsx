import { reservationStatusLabels } from "@/config/catalog";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/date";

export interface TimelineEntry {
  id: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  note: string | null;
  changedAt: Date;
  changedBy: { id: string; name: string | null } | null;
}

/**
 * Linha do tempo da reserva.
 *
 * Cada mudança de estado é rastreável: quem mudou, quando e por quê. É o que
 * permite ao NEABI reconstruir o atendimento meses depois.
 */
export function ReservationTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-[0.9375rem] text-ink-500">
        Nenhuma movimentação registrada até o momento.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.8125rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-neabi-red"
          />
          <p className="font-sans text-[0.9375rem] font-semibold text-ink-900">
            {reservationStatusLabels[entry.newStatus]}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-500">
            <time dateTime={entry.changedAt.toISOString()}>
              {formatDateTime(entry.changedAt)}
            </time>
            {entry.changedBy?.name ? ` · ${entry.changedBy.name}` : null}
          </p>
          {entry.note ? (
            <p className="mt-2 max-w-prose border-l-2 border-border-strong pl-3 text-[0.875rem] leading-relaxed text-ink-600">
              {entry.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
