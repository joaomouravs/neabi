import {
  BookCopy,
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  Eye,
  Inbox,
  Library,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  AdminEmpty,
  AdminPage,
  AdminSection,
  StatCard,
  adminLinkClass,
} from "@/components/admin/admin-ui";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { Button } from "@/components/ui/button";
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
      eyebrow="Painel administrativo"
      title="Visão geral"
      description="Estado atual do acervo, dos exemplares e das solicitações de reserva."
      action={
        <Button asChild>
          <Link href="/admin/acervo/novo">
            <Plus aria-hidden="true" />
            Cadastrar obra
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Reservas pendentes"
          value={metrics.pendingReservations}
          icon={Inbox}
          tone={metrics.pendingReservations > 0 ? "amber" : "neutral"}
          hint={
            metrics.pendingReservations > 0
              ? "Aguardando análise da equipe"
              : "Nada aguardando análise"
          }
          href="/admin/reservas?status=PENDING"
        />
        <StatCard
          label="Aguardando retirada"
          value={metrics.readyForPickup}
          icon={CalendarClock}
          tone={metrics.readyForPickup > 0 ? "amber" : "neutral"}
          href="/admin/reservas?status=READY_FOR_PICKUP"
        />
        <StatCard
          label="Reservas aprovadas"
          value={metrics.approvedReservations}
          icon={CalendarCheck}
          tone="green"
          href="/admin/reservas?status=APPROVED"
        />
        <StatCard
          label="Exemplares disponíveis"
          value={metrics.availableCopies}
          icon={CircleCheck}
          tone="green"
          hint={`de ${metrics.copies} exemplares físicos`}
          href="/admin/exemplares"
        />
        <StatCard
          label="Obras cadastradas"
          value={metrics.books}
          icon={Library}
          hint={`${metrics.publishedBooks} publicadas`}
          href="/admin/acervo"
        />
        <StatCard
          label="Exemplares físicos"
          value={metrics.copies}
          icon={BookCopy}
          href="/admin/exemplares"
        />
        <StatCard label="Usuários ativos" value={metrics.users} icon={Users} href="/admin/usuarios" />
        <StatCard
          label="Visualizações"
          value={metrics.views}
          icon={Eye}
          hint={`${metrics.viewsLast30Days} nos últimos 30 dias`}
          href="/admin/analytics"
        />
      </div>

      {metrics.needsReview > 0 ? (
        <div className="mt-4 flex flex-col gap-2 border-l-2 border-neabi-amber bg-neabi-amber-050 px-4 py-3 text-[0.875rem] leading-relaxed text-neabi-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong className="font-semibold">
              {metrics.needsReview} {metrics.needsReview === 1 ? "obra" : "obras"}
            </strong>{" "}
            com dados bibliográficos incompletos.
          </p>
          <Link
            href="/admin/acervo?cataloging=NEEDS_REVIEW"
            className="font-semibold underline underline-offset-4"
          >
            Revisar catalogação
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <AdminSection
          title="Solicitações aguardando análise"
          description="Reservas pendentes, da mais recente para a mais antiga."
          action={
            pending.total > 0 ? (
              <Link href="/admin/reservas?status=PENDING" className={adminLinkClass}>
                Ver todas ({pending.total})
              </Link>
            ) : null
          }
        >
          {pending.items.length === 0 ? (
            <AdminEmpty
              icon={Inbox}
              title="Nenhuma solicitação pendente"
              description="Novas solicitações aparecem aqui assim que forem enviadas."
            />
          ) : (
            <ul className="-my-3 flex flex-col divide-y divide-border">
              {pending.items.map((reservation) => (
                <li key={reservation.id}>
                  <Link
                    href={`/admin/reservas/${reservation.id}`}
                    className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[0.75rem] text-ink-500">{reservation.protocol}</p>
                      <p className="mt-0.5 line-clamp-1 font-medium text-ink-900 group-hover:text-neabi-red-700">
                        {reservation.book.title}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-500">
                        {reservation.fullName} · {formatDate(reservation.requestedDate)} ·{" "}
                        {shiftLabels[reservation.shift]}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ReservationStatusBadge status={reservation.status} size="sm" />
                      <span className="text-[0.75rem] text-ink-500">
                        {formatDateTime(reservation.createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Buscas sem resultado"
          description="O que a comunidade procurou e o acervo ainda não tem."
        >
          {emptySearches.length === 0 ? (
            <AdminEmpty
              icon={Search}
              title="Nenhuma busca sem resultado"
              description="Nos últimos 90 dias, toda busca encontrou ao menos uma obra."
            />
          ) : (
            <ul className="-my-2.5 flex flex-col divide-y divide-border">
              {emptySearches.map((search) => (
                <li key={search.query} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="line-clamp-1 text-[0.875rem] text-ink-800">{search.query}</span>
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
