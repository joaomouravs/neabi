import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPage, AdminSection } from "@/components/admin/admin-ui";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { BookCover } from "@/components/books/book-cover";
import { MetadataList } from "@/components/layout/primitives";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { ReservationTimeline } from "@/components/reservations/reservation-timeline";
import { patronTypeLabels, shiftLabels } from "@/config/catalog";
import { formatDate, formatDateTime, formatLongDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";
import { emailDeliveryEnabled } from "@/server/notifications";
import { findReservationById } from "@/server/repositories/reservation-repository";

type Params = Promise<{ id: string }>;

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Params;
}) {
  const [{ id }] = await Promise.all([
    params,
    requirePermission("reservation:read:any"),
  ]);

  const reservation = await findReservationById(id);
  if (!reservation) notFound();

  const copies = await prisma.physicalCopy.findMany({
    where: { bookId: reservation.book.id },
    select: { id: true, code: true, status: true },
    orderBy: { code: "asc" },
  });

  return (
    <AdminPage
      title={`Reserva ${reservation.protocol}`}
      description={
        <span className="flex flex-wrap items-center gap-3">
          <ReservationStatusBadge status={reservation.status} size="sm" />
          <span className="text-[0.8125rem] text-ink-500">
            Solicitada em {formatDateTime(reservation.createdAt)}
          </span>
        </span>
      }
      breadcrumb={{ href: "/admin/reservas", label: "Voltar para reservas" }}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <AdminSection title="Ações">
            <ReservationActions
              emailEnabled={emailDeliveryEnabled()}
              reservationId={reservation.id}
              status={reservation.status}
              copies={copies}
              currentCopyId={reservation.copy?.id ?? null}
            />
          </AdminSection>

          <AdminSection title="Dados da solicitação">
            <MetadataList
              items={[
                {
                  label: "Obra",
                  value: (
                    <Link
                      href={`/admin/acervo/${reservation.book.id}`}
                      className="underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red"
                    >
                      {reservation.book.title}
                    </Link>
                  ),
                },
                {
                  label: "Exemplar",
                  value: reservation.copy
                    ? [
                        reservation.copy.code,
                        reservation.copy.location,
                        reservation.copy.shelf,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : null,
                },
                {
                  label: "Data solicitada",
                  value: `${formatLongDate(reservation.requestedDate)} · ${shiftLabels[reservation.shift]}`,
                },
                {
                  label: "Prazo de retirada",
                  value: reservation.pickupDeadline
                    ? formatDate(reservation.pickupDeadline)
                    : null,
                },
                { label: "Finalidade", value: reservation.purpose },
                { label: "Observação da equipe", value: reservation.adminNote },
                {
                  label: "Aprovada por",
                  value: reservation.approvedBy?.name,
                },
                {
                  label: "Retirada em",
                  value: reservation.pickedUpAt
                    ? formatDateTime(reservation.pickedUpAt)
                    : null,
                },
                {
                  label: "Devolvida em",
                  value: reservation.returnedAt
                    ? formatDateTime(reservation.returnedAt)
                    : null,
                },
              ]}
            />
          </AdminSection>

          <AdminSection title="Histórico">
            <ReservationTimeline entries={reservation.history} />
          </AdminSection>
        </div>

        <div className="flex flex-col gap-6">
          <AdminSection title="Solicitante">
            <MetadataList
              stacked
              items={[
                { label: "Nome", value: reservation.fullName },
                {
                  label: "Vínculo",
                  value: patronTypeLabels[reservation.patronType],
                },
                { label: "Matrícula", value: reservation.registrationId },
                {
                  label: "E-mail",
                  value: (
                    <a
                      href={`mailto:${reservation.email}`}
                      className="underline underline-offset-4"
                    >
                      {reservation.email}
                    </a>
                  ),
                },
                { label: "Telefone", value: reservation.phone },
                {
                  label: "Conta",
                  value: (
                    <Link
                      href={`/admin/usuarios?q=${encodeURIComponent(reservation.user.email)}`}
                      className="underline underline-offset-4"
                    >
                      {reservation.user.name ?? reservation.user.email}
                    </Link>
                  ),
                },
              ]}
            />
          </AdminSection>

          <AdminSection title="Obra">
            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <BookCover
                  title={reservation.book.title}
                  coverImage={reservation.book.coverImage}
                  coverAlt={reservation.book.coverAlt}
                  sizes="96px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-pretty font-display text-base font-semibold leading-tight text-ink-900">
                  {reservation.book.title}
                </p>
                <Link
                  href={`/acervo/${reservation.book.slug}`}
                  className="mt-2 inline-block text-[0.8125rem] text-neabi-red-600 underline underline-offset-4"
                >
                  Ver no site
                </Link>
              </div>
            </div>
          </AdminSection>
        </div>
      </div>
    </AdminPage>
  );
}
