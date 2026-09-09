import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCover } from "@/components/books/book-cover";
import { MetadataList } from "@/components/layout/primitives";
import { CancelReservationForm } from "@/components/reservations/cancel-reservation-form";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { ReservationTimeline } from "@/components/reservations/reservation-timeline";
import { Alert } from "@/components/ui/feedback";
import { patronTypeLabels, shiftLabels } from "@/config/catalog";
import { formatDate, formatDateTime, formatLongDate } from "@/lib/date";
import { requireActor } from "@/server/auth/session";
import { canCancelReservation, canViewReservation } from "@/server/permissions/rbac";
import { findReservationById } from "@/server/repositories/reservation-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import { ACTIVE_STATUSES } from "@/server/services/reservation-rules";

export const metadata: Metadata = {
  title: "Detalhes da reserva",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function ReservationDetailPage({
  params,
}: {
  params: Params;
}) {
  const [{ id }, actor] = await Promise.all([params, requireActor()]);

  const reservation = await findReservationById(id);

  // Um identificador válido de outra pessoa devolve 404, não 403: não
  // confirmamos sequer a existência de reservas alheias.
  if (!reservation || !canViewReservation(actor, reservation)) notFound();

  const settings = await getSettings();
  const location = [settings.institution, settings.campus, settings.address]
    .filter((part) => part && part.length > 0)
    .join(" — ");

  const cancellable =
    ACTIVE_STATUSES.includes(reservation.status) &&
    canCancelReservation(actor, reservation);

  return (
    <article>
      <nav aria-label="Trilha de navegação" className="mb-6">
        <Link
          href="/minha-conta/reservas"
          className="text-[0.875rem] text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          ← Voltar para minhas reservas
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.8125rem] text-ink-500">
            {reservation.protocol}
          </p>
          <h2 className="mt-2 text-balance font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-ink-900">
            {reservation.book.title}
          </h2>
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </header>

      {reservation.status === "READY_FOR_PICKUP" && reservation.pickupDeadline ? (
        <div className="mt-6">
          <Alert variant="success" title="Exemplar separado para retirada">
            Compareça até {formatLongDate(reservation.pickupDeadline)}. Após essa
            data a reserva expira e a obra volta ao acervo.
          </Alert>
        </div>
      ) : null}

      {reservation.status === "REJECTED" && reservation.adminNote ? (
        <div className="mt-6">
          <Alert variant="warning" title="Observação da equipe">
            {reservation.adminNote}
          </Alert>
        </div>
      ) : null}

      <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-12">
        <div className="min-w-0 order-2 lg:order-1">
          <section aria-labelledby="dados-reserva">
            <h3
              id="dados-reserva"
              className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
            >
              Dados da solicitação
            </h3>
            <div className="mt-4">
              <MetadataList
                items={[
                  {
                    label: "Obra",
                    value: (
                      <Link
                        href={`/acervo/${reservation.book.slug}`}
                        className="underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red"
                      >
                        {reservation.book.title}
                      </Link>
                    ),
                  },
                  {
                    label: "Data solicitada",
                    value: `${formatLongDate(reservation.requestedDate)} · ${shiftLabels[reservation.shift]}`,
                  },
                  { label: "Local", value: location || null },
                  {
                    label: "Exemplar",
                    value: reservation.copy
                      ? `${reservation.copy.code}${reservation.copy.shelf ? ` · ${reservation.copy.shelf}` : ""}`
                      : null,
                  },
                  {
                    label: "Prazo de retirada",
                    value: reservation.pickupDeadline
                      ? formatDate(reservation.pickupDeadline)
                      : null,
                  },
                  { label: "Solicitante", value: reservation.fullName },
                  {
                    label: "Vínculo",
                    value: patronTypeLabels[reservation.patronType],
                  },
                  { label: "Matrícula", value: reservation.registrationId },
                  { label: "E-mail", value: reservation.email },
                  { label: "Telefone", value: reservation.phone },
                  { label: "Finalidade", value: reservation.purpose },
                  {
                    label: "Solicitada em",
                    value: formatDateTime(reservation.createdAt),
                  },
                ]}
              />
            </div>
          </section>

          <section aria-labelledby="historico-reserva" className="mt-10">
            <h3
              id="historico-reserva"
              className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500"
            >
              Acompanhamento
            </h3>
            <div className="mt-4">
              <ReservationTimeline entries={reservation.history} />
            </div>
          </section>

          {cancellable ? (
            <section
              aria-labelledby="cancelar-reserva"
              className="mt-10 border-t border-border pt-8"
            >
              <h3
                id="cancelar-reserva"
                className="font-display text-lg font-semibold text-ink-900"
              >
                Cancelar reserva
              </h3>
              <p className="mt-1.5 max-w-prose text-[0.875rem] leading-relaxed text-ink-600">
                Ao cancelar, o exemplar volta imediatamente ao acervo e fica
                disponível para outras pessoas.
              </p>
              <div className="mt-4">
                <CancelReservationForm reservationId={reservation.id} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="mx-auto w-32 lg:mx-0 lg:w-full">
            <BookCover
              title={reservation.book.title}
              coverImage={reservation.book.coverImage}
              coverAlt={reservation.book.coverAlt}
              sizes="(min-width: 1024px) 200px, 128px"
            />
          </div>
        </aside>
      </div>
    </article>
  );
}
