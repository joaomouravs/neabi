import { CalendarCheck } from "lucide-react";
import Link from "next/link";

import {
  AdminFilterTabs,
  AdminPage,
  AdminTable,
  Td,
  Th,
  adminLinkClass,
} from "@/components/admin/admin-ui";
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
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const filters = adminReservationFiltersSchema.parse(flat);

  const [result, counts] = await Promise.all([
    listReservationsForAdmin(filters),
    countReservationsByStatus(),
  ]);

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    const merged = { q: filters.q, status: filters.status, page: filters.page, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "" || value === null) continue;
      if (key === "page" && Number(value) === 1) continue;
      search.set(key, String(value));
    }
    const query = search.toString();
    return `/admin/reservas${query ? `?${query}` : ""}`;
  };

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <AdminPage
      eyebrow="Atendimento"
      title="Reservas"
      description="Solicitações de consulta e retirada presencial do acervo."
    >
      <div className="flex flex-col gap-4">
        <div className="max-w-xl">
          <AdminSearch
            placeholder="Buscar por protocolo, nome, e-mail ou obra"
            defaultValue={filters.q}
          />
        </div>

        <AdminFilterTabs
          label="Filtrar reservas por situação"
          items={TABS.map((tab) => ({
            href: buildHref({ status: tab.value || undefined, page: 1 }),
            label: tab.label,
            active: (filters.status ?? "") === tab.value,
            count: tab.value ? counts[tab.value] : total,
          }))}
        />
      </div>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Nenhuma reserva encontrada"
            description="Ajuste a busca ou selecione outra situação."
          />
        ) : (
          <AdminTable
            caption="Reservas registradas"
            head={
              <>
                <Th>Protocolo e situação</Th>
                <Th>Solicitante</Th>
                <Th>Obra</Th>
                <Th>Data solicitada</Th>
                <Th>Exemplar</Th>
                <Th>Criada em</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </>
            }
          >
            {result.items.map((reservation) => (
              <tr key={reservation.id} className="transition-colors hover:bg-surface-muted">
                {/* O essencial — protocolo, situação e o acesso à reserva —
                    fica na primeira coluna, visível no celular sem rolar. */}
                <Td className="whitespace-nowrap">
                  <Link
                    href={`/admin/reservas/${reservation.id}`}
                    className="font-mono text-[0.8125rem] font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red-600"
                  >
                    {reservation.protocol}
                  </Link>
                  <div className="mt-1.5">
                    <ReservationStatusBadge status={reservation.status} size="sm" />
                  </div>
                </Td>
                <Td className="max-w-48">
                  <p className="truncate font-medium text-ink-900">{reservation.fullName}</p>
                  <p className="truncate text-[0.75rem] text-ink-500">
                    {patronTypeLabels[reservation.patronType]}
                  </p>
                </Td>
                <Td className="max-w-64">
                  <span className="line-clamp-2">{reservation.book.title}</span>
                </Td>
                <Td className="whitespace-nowrap text-ink-700">
                  {formatDate(reservation.requestedDate)}
                  <span className="block text-[0.75rem] text-ink-500">
                    {shiftLabels[reservation.shift]}
                  </span>
                </Td>
                <Td className="whitespace-nowrap font-mono text-[0.75rem] text-ink-600">
                  {reservation.copy?.code ?? <span className="font-sans text-ink-500">—</span>}
                </Td>
                <Td className="whitespace-nowrap text-[0.8125rem] text-ink-500">
                  {formatDateTime(reservation.createdAt)}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/reservas/${reservation.id}`} className={adminLinkClass}>
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
