import { Mail } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { contactStatusLabels, contactStatusTone } from "@/config/catalog";
import { ContactStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { requirePermission } from "@/server/auth/session";
import {
  countContactMessagesByStatus,
  listContactMessagesForAdmin,
} from "@/server/repositories/contact-repository";
import { adminContactFiltersSchema } from "@/validators/contact";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: { value: ContactStatus | ""; label: string; tone?: "amber" }[] = [
  { value: "", label: "Todas" },
  { value: ContactStatus.NEW, label: "Novas", tone: "amber" },
  { value: ContactStatus.READ, label: "Lidas" },
  { value: ContactStatus.ANSWERED, label: "Respondidas" },
  { value: ContactStatus.ARCHIVED, label: "Arquivadas" },
];

export default async function AdminContactMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("contact:read");

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const filters = adminContactFiltersSchema.parse(flat);

  const [result, counts] = await Promise.all([
    listContactMessagesForAdmin(filters),
    countContactMessagesByStatus(),
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
    return `/admin/mensagens${query ? `?${query}` : ""}`;
  };

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const filtering = Boolean(filters.q || filters.status);

  return (
    <AdminPage
      eyebrow="Atendimento"
      title="Mensagens"
      description="O que chega pelo formulário de contato do site. A resposta é enviada pelo e-mail de quem atende."
    >
      <div className="flex flex-col gap-4">
        <div className="max-w-xl">
          <AdminSearch
            placeholder="Buscar por nome, e-mail, assunto ou texto"
            defaultValue={filters.q}
          />
        </div>

        <AdminFilterTabs
          label="Filtrar mensagens por situação"
          items={TABS.map((tab) => ({
            href: buildHref({ status: tab.value || undefined, page: 1 }),
            label: tab.label,
            active: (filters.status ?? "") === tab.value,
            count: tab.value ? counts[tab.value] : total,
            tone: tab.tone,
          }))}
        />
      </div>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={filtering ? "Nenhuma mensagem encontrada" : "Nenhuma mensagem recebida"}
            description={
              filtering
                ? "Ajuste a busca ou selecione outra situação."
                : "As mensagens enviadas pela página de contato aparecem aqui."
            }
          />
        ) : (
          <AdminTable
            caption="Mensagens de contato"
            head={
              <>
                <Th>Remetente e situação</Th>
                <Th>Assunto</Th>
                <Th>Recebida em</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </>
            }
          >
            {result.items.map((message) => {
              const unread = message.status === ContactStatus.NEW;
              return (
                <tr key={message.id} className="transition-colors hover:bg-surface-muted">
                  {/* Quem escreveu, a situação e o acesso à mensagem ficam na
                      primeira coluna, visíveis no celular sem rolar. */}
                  <Td className="max-w-56">
                    <Link
                      href={`/admin/mensagens/${message.id}`}
                      className={cn(
                        "block truncate text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red-600",
                        unread ? "font-semibold" : "font-medium",
                      )}
                    >
                      {message.name}
                    </Link>
                    <p className="truncate text-[0.75rem] text-ink-500">{message.email}</p>
                    <div className="mt-1.5">
                      <Badge variant={contactStatusTone[message.status]} size="sm">
                        {contactStatusLabels[message.status]}
                      </Badge>
                    </div>
                  </Td>
                  <Td className="max-w-md">
                    <p className={cn("line-clamp-1 text-ink-900", unread && "font-semibold")}>
                      {message.subject}
                    </p>
                    <p className="line-clamp-2 text-[0.8125rem] text-ink-500">{message.message}</p>
                  </Td>
                  <Td className="whitespace-nowrap text-[0.8125rem] text-ink-500">
                    {formatDateTime(message.createdAt)}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <Link href={`/admin/mensagens/${message.id}`} className={adminLinkClass}>
                      Abrir
                    </Link>
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
