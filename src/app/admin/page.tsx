import Link from "next/link";

import { AdminPage, AdminSection, StatCard } from "@/components/admin/admin-ui";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { shiftLabels } from "@/config/catalog";
import { formatDate, formatDateTime } from "@/lib/date";
import { requireAnyPermission } from "@/server/auth/session";
import {
  getDashboardMetrics,
  getEmptySearches,
} from "@/server/repositories/analytics-repository";
import { listReservationsForAdmin } from "@/server/repositories/reservation-repository";

export default async function AdminDashboardPage() {
  await requireAnyPermission(["book:create", "reservation:manage"]);

  const [metrics, pending, emptySearches] = await Promise.all([
    getDashboardMetrics(),
    listReservationsForAdmin({ status: "PENDING", page: 1, perPage: 6 }),
    getEmptySearches(6),
  ]);

  return (
    <AdminPage
      title="Visão geral"
      description="Estado atual do acervo, dos exemplares e das solicitações de reserva."
      action={
        <Button asChild>
          <Link href="/admin/acervo/novo">Cadastrar obra</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Obras cadastradas"
          value={metrics.books}
          hint={`${metrics.publishedBooks} publicadas`}
          href="/admin/acervo"
        />
        <StatCard
          label="Exemplares físicos"
          value={metrics.copies}
          href="/admin/exemplares"
        />
        <StatCard
          label="Exemplares disponíveis"
          value={metrics.availableCopies}
          tone="green"
          href="/admin/exemplares"
        />
        <StatCard
          label="Reservas pendentes"
          value={metrics.pendingReservations}
          tone={metrics.pendingReservations > 0 ? "amber" : "neutral"}
          hint={
            metrics.pendingReservations > 0
              ? "Aguardando análise da equipe"
              : "Nada aguardando análise"
          }
          href="/admin/reservas?status=PENDING"
        />
        <StatCard
          label="Reservas aprovadas"
          value={metrics.approvedReservations}
          tone="green"
          href="/admin/reservas?status=APPROVED"
        />
        <StatCard
          label="Aguardando retirada"
          value={metrics.readyForPickup}
          tone="amber"
          href="/admin/reservas?status=READY_FOR_PICKUP"
        />
        <StatCard
          label="Usuários ativos"
          value={metrics.users}
          href="/admin/usuarios"
        />
        <StatCard
          label="Visualizações"
          value={metrics.views}
          hint={`${metrics.viewsLast30Days} nos últimos 30 dias`}
          href="/admin/analytics"
        />
      </div>

      {metrics.needsReview > 0 ? (
        <div className="mt-4 border-l-2 border-neabi-amber bg-neabi-amber-050 px-4 py-3 text-[0.875rem] leading-relaxed text-neabi-amber-900">
          <strong className="font-semibold">
            {metrics.needsReview}{" "}
            {metrics.needsReview === 1 ? "obra" : "obras"}
          </strong>{" "}
          com dados bibliográficos incompletos.{" "}
          <Link
            href="/admin/acervo?cataloging=NEEDS_REVIEW"
            className="underline underline-offset-4"
          >
            Revisar catalogação
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <AdminSection
          title="Solicitações aguardando análise"
          description="Reservas pendentes, da mais antiga para a mais recente."
        >
          {pending.items.length === 0 ? (
            <EmptyState
              title="Nenhuma solicitação pendente"
              description="Novas solicitações aparecerão aqui assim que forem enviadas."
              className="border-0 py-8"
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {pending.items.map((reservation) => (
                <li key={reservation.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/admin/reservas/${reservation.id}`}
                    className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[0.75rem] text-ink-500">
                        {reservation.protocol}
                      </p>
                      <p className="mt-0.5 line-clamp-1 font-medium text-ink-900 group-hover:text-neabi-red-700">
                        {reservation.book.title}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-500">
                        {reservation.fullName} ·{" "}
                        {formatDate(reservation.requestedDate)} ·{" "}
                        {shiftLabels[reservation.shift]}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReservationStatusBadge
                        status={reservation.status}
                        size="sm"
                      />
                      <span className="text-[0.75rem] text-ink-400">
                        {formatDateTime(reservation.createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pending.total > pending.items.length ? (
            <p className="mt-4 border-t border-border pt-4">
              <Link
                href="/admin/reservas?status=PENDING"
                className="text-[0.875rem] font-semibold text-neabi-red-600 underline underline-offset-4"
              >
                Ver todas as {pending.total} solicitações pendentes
              </Link>
            </p>
          ) : null}
        </AdminSection>

        <AdminSection
          title="Buscas sem resultado"
          description="O que a comunidade procurou e o acervo ainda não tem."
        >
          {emptySearches.length === 0 ? (
            <p className="py-4 text-[0.875rem] text-ink-500">
              Nenhuma busca sem resultado nos últimos 90 dias.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {emptySearches.map((search) => (
                <li
                  key={search.query}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="line-clamp-1 text-[0.875rem] text-ink-800">
                    {search.query}
                  </span>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-ink-500">
                    {search.searches}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>
    </AdminPage>
  );
}
