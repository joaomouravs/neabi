import { History } from "lucide-react";

import {
  AdminFilterTabs,
  AdminPage,
  AdminTable,
  Td,
  Th,
  adminLinkClass,
} from "@/components/admin/admin-ui";
import { Pagination } from "@/components/catalog/pagination";
import { EmptyState } from "@/components/ui/feedback";
import Link from "@/components/ui/link";
import { describeActivity } from "@/lib/activity-description";
import { formatDateTime } from "@/lib/date";
import { requirePagePermission } from "@/server/auth/session";
import {
  isActivityGroup,
  listActivities,
  type ActivityGroup,
} from "@/server/repositories/activity-repository";

export const metadata = { title: "Atividades" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: { value: ActivityGroup | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "acervo", label: "Acervo" },
  { value: "arquivos", label: "Arquivos" },
  { value: "contas", label: "Contas" },
  { value: "configuracoes", label: "Configurações" },
  { value: "mensagens", label: "Mensagens" },
];

/**
 * Registro de atividades da equipe.
 *
 * Responde "quem fez o quê, e quando" para as ações administrativas: catalogar,
 * editar e excluir obras, enviar e autorizar arquivos, mudar papéis e contas,
 * alterar configurações e tratar mensagens. As mudanças de cada reserva ficam
 * na linha do tempo da própria reserva.
 */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePagePermission("audit:read");

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const group = isActivityGroup(first(raw.grupo)) ? (first(raw.grupo) as ActivityGroup) : undefined;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(first(raw.page) ?? "1", 10) || 1));

  const result = await listActivities({ group, page });

  const buildHref = (next: { grupo?: string; page?: number }) => {
    const search = new URLSearchParams();
    const grupo = "grupo" in next ? next.grupo : group;
    if (grupo) search.set("grupo", grupo);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const query = search.toString();
    return `/admin/atividades${query ? `?${query}` : ""}`;
  };

  return (
    <AdminPage
      eyebrow="Gestão"
      title="Atividades"
      description="O que a equipe fez no painel: acervo, arquivos, contas, configurações e mensagens. As mudanças de cada reserva estão na linha do tempo da reserva."
    >
      <AdminFilterTabs
        label="Filtrar atividades por área"
        items={TABS.map((tab) => ({
          href: buildHref({ grupo: tab.value || undefined, page: 1 }),
          label: tab.label,
          active: (group ?? "") === tab.value,
        }))}
      />

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma atividade registrada"
            description={
              group
                ? "Nada registrado nesta área ainda. Selecione outra ou veja todas."
                : "As ações da equipe no painel passam a aparecer aqui assim que acontecem."
            }
          />
        ) : (
          <AdminTable
            caption="Atividades da equipe, da mais recente para a mais antiga"
            head={
              <>
                <Th>O que foi feito</Th>
                <Th>Quem</Th>
                <Th>Quando</Th>
              </>
            }
          >
            {result.items.map((item) => {
              const description = describeActivity(item.event, item.details, result);
              return (
                <tr key={item.id} className="transition-colors hover:bg-surface-muted">
                  <Td className="max-w-md">
                    <p className="text-ink-900">{description.text}</p>
                    {/* No celular as colunas "Quem" e "Quando" ficam fora da
                        vista: o essencial da auditoria vem junto da ação. */}
                    <p className="mt-0.5 text-[0.75rem] text-ink-500 md:hidden">
                      {item.actor ? (item.actor.name ?? item.actor.email) : "Conta removida"} ·{" "}
                      {formatDateTime(item.createdAt)}
                    </p>
                    {description.bookId ? (
                      <Link href={`/admin/acervo/${description.bookId}`} className={adminLinkClass}>
                        Abrir a obra
                      </Link>
                    ) : null}
                  </Td>
                  <Td className="max-w-56">
                    {item.actor ? (
                      <>
                        <p className="truncate font-medium text-ink-900">
                          {item.actor.name ?? item.actor.email}
                        </p>
                        {item.actor.name ? (
                          <p className="truncate text-[0.75rem] text-ink-500">{item.actor.email}</p>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-ink-500">Conta removida</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[0.8125rem] text-ink-500">
                    {formatDateTime(item.createdAt)}
                  </Td>
                </tr>
              );
            })}
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
