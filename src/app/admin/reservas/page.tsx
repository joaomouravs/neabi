import Link from "next/link";

import { AdminPage, AdminTable, Td, Th } from "@/components/admin/admin-ui";
import { AdminSearch } from "@/components/admin/admin-search";
import { Pagination } from "@/components/catalog/pagination";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { EmptyState } from "@/components/ui/feedback";
import { patronTypeLabels, shiftLabels } from "@/config/catalog";
import { ReservationStatus } from "@/generated/prisma/enums";
import { formatDate, formatDateTime } from "@/lib/date";
import { requirePermission } from "@/server/auth/session";
import {
  countReservationsByStatus,
  listReservationsForAdmin,
} from "@/server/repositories/reservation-repository";
import { adminReservationFiltersSchema } from "@/validators/reservation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: { value: ReservationStatus | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: ReservationStatus.PENDING, label: "Pendentes" },
  { value: ReservationStatus.APPROVED, label: "Aprovadas" },
  { value: ReservationStatus.READY_FOR_PICKUP, label: "Aguardando retirada" },
  { value: ReservationStatus.PICKED_UP, label: "Em consulta" },
  { value: ReservationStatus.RETURNED, label: "Concluídas" },
  { value: ReservationStatus.REJECTED, label: "Recusadas" },
  { value: ReservationStatus.CANCELLED, label: "Canceladas" },
  { value: ReservationStatus.EXPIRED, label: "Expiradas" },
];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("reservation:read:any");

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const filters = adminReservationFiltersSchema.parse(flat);

  const [result, counts] = await Promise.all([
    listReservationsForAdmin(filters),
    countReservationsByStatus(),
  ]);

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    const merged = {
      q: filters.q,
      status: filters.status,
      page: filters.page,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "" || value === null) continue;
      if (key === "page" && Number(value) === 1) continue;
      search.set(key, String(value));
    }
    const query = search.toString();
    return `/admin/reservas${query ? `?${query}` : ""}`;
  };

  return (
    <AdminPage
      title="Reservas"
      description="Solicitações de consulta e retirada presencial do acervo."
    >
      <div className="flex flex-col gap-4">
        <div className="max-w-md">
          <AdminSearch
            placeholder="Buscar por protocolo, nome, e-mail ou obra"
            defaultValue={filters.q}
          />
        </div>

        <nav aria-label="Filtrar reservas por situação">
          <ul className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const active = (filters.status ?? "") === tab.value;
              const count = tab.value
                ? counts[tab.value]
                : Object.values(counts).reduce((sum, value) => sum + value, 0);
              return (
                <li key={tab.value || "todas"}>
                  <Link
                    href={buildHref({ status: tab.value || undefined, page: 1 })}
                    aria-current={active ? "true" : undefined}
                    className={
                      active
                        ? "inline-flex items-center gap-2 border border-neabi-black bg-neabi-black px-3 py-1.5 font-sans text-[0.8125rem] font-medium text-neabi-cream"
                        : "inline-flex items-center gap-2 border border-ink-900/20 px-3 py-1.5 font-sans text-[0.8125rem] text-ink-700 hover:border-ink-900/45"
                    }
                  >
                    {tab.label}
                    <span
                      className={
                        active
                          ? "tabular-nums text-neabi-cream/70"
                          : "tabular-nums text-ink-400"
                      }
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva encontrada"
            description="Ajuste a busca ou selecione outra situação."
          />
        ) : (
          <AdminTable
            caption="Reservas registradas"
            head={
              <>
                <Th>Protocolo</Th>
                <Th>Solicitante</Th>
                <Th>Obra</Th>
                <Th>Exemplar</Th>
                <Th>Data solicitada</Th>
                <Th>Situação</Th>
                <Th>Criada em</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </>
            }
          >
            {result.items.map((reservation) => (
              <tr key={reservation.id} className="hover:bg-surface-muted">
                <Td className="whitespace-nowrap font-mono text-[0.8125rem]">
                  {reservation.protocol}
                </Td>
                <Td className="max-w-48">
                  <p className="truncate font-medium text-ink-900">
                    {reservation.fullName}
                  </p>
                  <p className="truncate text-[0.75rem] text-ink-500">
                    {patronTypeLabels[reservation.patronType]}
                  </p>
                </Td>
                <Td className="max-w-64">
                  <span className="line-clamp-2">{reservation.book.title}</span>
                </Td>
                <Td className="whitespace-nowrap font-mono text-[0.75rem] text-ink-600">
                  {reservation.copy?.code ?? (
                    <span className="font-sans text-ink-400">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-ink-600">
                  {formatDate(reservation.requestedDate)}
                  <span className="block text-[0.75rem] text-ink-500">
                    {shiftLabels[reservation.shift]}
                  </span>
                </Td>
                <Td>
                  <ReservationStatusBadge status={reservation.status} size="sm" />
                </Td>
                <Td className="whitespace-nowrap text-[0.8125rem] text-ink-500">
                  {formatDateTime(reservation.createdAt)}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <Link
                    href={`/admin/reservas/${reservation.id}`}
                    className="text-[0.8125rem] font-semibold text-neabi-red-600 underline underline-offset-4"
                  >
                    Abrir
                  </Link>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(target) => buildHref({ page: target })}
        className="mt-8"
      />
    </AdminPage>
  );
}
