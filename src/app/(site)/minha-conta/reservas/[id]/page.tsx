import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { BookCover } from "@/components/books/book-cover";
import { MetadataList } from "@/components/layout/primitives";
import { CancelReservationForm } from "@/components/reservations/cancel-reservation-form";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { ReservationTimeline } from "@/components/reservations/reservation-timeline";
import { CopyButton } from "@/components/ui/copy-button";
import { Alert } from "@/components/ui/feedback";
import {
  patronTypeLabels,
  reservationStatusGuidance,
  shiftLabels,
} from "@/config/catalog";
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

export default async function ReservationDetailPage({ params }: { params: Params }) {
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
    ACTIVE_STATUSES.includes(reservation.status) && canCancelReservation(actor, reservation);

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label="Trilha de navegação">
        <Link
          href="/minha-conta/reservas"
          className="group inline-flex min-h-10 items-center gap-2 text-[0.875rem] font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Minhas reservas
        </Link>
      </nav>

      <header className="overflow-hidden border border-border-strong bg-surface shadow-card">
        <div aria-hidden="true" className="neabi-rule h-1 w-full" />
        <div className="grid gap-5 p-5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-7 sm:p-7">
          <div className="w-20 sm:w-24">
            <BookCover
              title={reservation.book.title}
              coverImage={reservation.book.coverImage}
              coverAlt={reservation.book.coverAlt}
              sizes="96px"
              decorative
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <ReservationStatusBadge status={reservation.status} />
              <span className="font-mono text-[0.8125rem] text-ink-600">{reservation.protocol}</span>
              <CopyButton
                value={reservation.protocol}
                label="Copiar protocolo"
                successTitle="Protocolo copiado"
                variant="ghost"
                size="sm"
                className="-ml-2"
              />
            </div>
            <h2 className="mt-3 text-balance font-display text-display-sm font-bold text-ink-900">
              <Link
                href={`/acervo/${reservation.book.slug}`}
                className="underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:decoration-neabi-red-600"
              >
                {reservation.book.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-prose text-[1rem] leading-relaxed text-ink-700">
              {reservationStatusGuidance[reservation.status]}
            </p>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4 text-[0.9375rem]">
              <Quick label="Data solicitada" value={formatLongDate(reservation.requestedDate)} />
              <Quick label="Turno" value={shiftLabels[reservation.shift]} />
              {reservation.pickupDeadline ? (
                <Quick label="Prazo de retirada" value={formatDate(reservation.pickupDeadline)} />
              ) : null}
            </dl>
          </div>
        </div>
      </header>

      {reservation.status === "READY_FOR_PICKUP" && reservation.pickupDeadline ? (
        <Alert variant="success" title="Exemplar separado para retirada">
          Compareça até {formatLongDate(reservation.pickupDeadline)}. Após essa data a
          reserva expira e a obra volta ao acervo.
        </Alert>
      ) : null}

      {reservation.status === "REJECTED" && reservation.adminNote ? (
        <Alert variant="warning" title="Observação da equipe">
          {reservation.adminNote}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="dados-reserva" title="Dados da solicitação">
            <MetadataList
              items={[
                { label: "Local", value: location || null },
                {
                  label: "Exemplar",
                  value: reservation.copy
                    ? `${reservation.copy.code}${reservation.copy.shelf ? ` · ${reservation.copy.shelf}` : ""}`
                    : null,
                },
                { label: "Solicitante", value: reservation.fullName },
                { label: "Vínculo", value: patronTypeLabels[reservation.patronType] },
                { label: "Matrícula", value: reservation.registrationId },
                { label: "E-mail", value: reservation.email },
                { label: "Telefone", value: reservation.phone },
                { label: "Finalidade", value: reservation.purpose },
                { label: "Solicitada em", value: formatDateTime(reservation.createdAt) },
              ]}
            />
          </Panel>

          {cancellable ? (
            <Panel id="cancelar-reserva" title="Cancelar reserva">
              <p className="mb-4 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
                Ao cancelar, o exemplar volta imediatamente ao acervo e fica disponível
                para outras pessoas. Esta ação não pode ser desfeita.
              </p>
              <CancelReservationForm reservationId={reservation.id} />
            </Panel>
          ) : null}
        </div>

        <Panel id="historico-reserva" title="Acompanhamento">
          <ReservationTimeline entries={reservation.history} />
        </Panel>
      </div>
    </article>
  );
}

function Quick({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="eyebrow tracking-widest text-ink-500">{label}</dt>
      <dd className="mt-1 font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 self-start border border-border bg-surface p-5 sm:p-6">
      <h3 id={id} className="mb-5 font-display text-[1.375rem] font-bold leading-tight text-ink-900">
        {title}
      </h3>
      {children}
    </section>
  );
}
