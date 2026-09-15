import { reservationStatusLabels, reservationStatusTone } from "@/config/catalog";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface TimelineEntry {
  id: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  note: string | null;
  changedAt: Date;
  changedBy: { id: string; name: string | null } | null;
}

const TONE_DOT = {
  neutral: "bg-ink-400",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
  red: "bg-neabi-red",
} as const;

/**
 * Linha do tempo da reserva.
 *
 * Cada mudança de estado é rastreável: quem mudou, quando e por quê. A mais
 * recente fica marcada como o estado atual.
 */
export function ReservationTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-[0.9375rem] text-ink-500">
        Nenhuma movimentação registrada até o momento.
      </p>
    );
  }

  const lastIndex = entries.length - 1;

  return (
    <ol className="relative flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
          {index < lastIndex ? (
            <span aria-hidden="true" className="absolute bottom-0 left-[0.6875rem] top-5 w-px bg-border-strong" />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-1 flex size-[1.375rem] items-center justify-center border-2 border-background",
              index === lastIndex ? "ring-2 ring-offset-0" : "",
              index === lastIndex ? "ring-ink-900/15" : "",
              TONE_DOT[reservationStatusTone[entry.newStatus]],
            )}
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 font-sans text-[0.9375rem] font-semibold text-ink-900">
              {reservationStatusLabels[entry.newStatus]}
              {index === lastIndex ? (
                <span className="eyebrow tracking-[0.1em] text-ink-500">· atual</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-ink-500">
              <time dateTime={entry.changedAt.toISOString()}>{formatDateTime(entry.changedAt)}</time>
              {entry.changedBy?.name ? ` · ${entry.changedBy.name}` : null}
            </p>
            {entry.note ? (
              <p className="mt-2 max-w-prose border-l-2 border-border-strong pl-3 text-[0.875rem] leading-relaxed text-ink-600">
                {entry.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
