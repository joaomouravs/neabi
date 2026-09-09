import { AdminPage, AdminTable, Th } from "@/components/admin/admin-ui";
import { AdminSearch } from "@/components/admin/admin-search";
import { UserRow } from "@/components/admin/users-manager";
import { Pagination } from "@/components/catalog/pagination";
import { EmptyState } from "@/components/ui/feedback";
import { ADMIN_PAGE_SIZE } from "@/config/site";
import { Prisma } from "@/generated/prisma/client";
import { escapeLike } from "@/lib/text";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/permissions/rbac";
import { ACTIVE_STATUSES } from "@/server/services/reservation-rules";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requirePermission("user:read:any");

  const raw = await searchParams;
  const single = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const term = (single("q") ?? "").trim();
  const page = Math.max(1, Number(single("page") ?? 1) || 1);

  const where: Prisma.UserWhereInput =
    term.length > 0
      ? {
          OR: [
            { name: { contains: escapeLike(term), mode: "insensitive" } },
            { email: { contains: escapeLike(term), mode: "insensitive" } },
            {
              registrationId: {
                contains: escapeLike(term),
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        patronType: true,
        registrationId: true,
        createdAt: true,
        _count: {
          select: {
            reservations: true,
          },
        },
        reservations: {
          where: { status: { in: [...ACTIVE_STATUSES] } },
          select: { id: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const buildHref = (target: number) => {
    const search = new URLSearchParams();
    if (term) search.set("q", term);
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return `/admin/usuarios${query ? `?${query}` : ""}`;
  };

  return (
    <AdminPage
      title="Usuários"
      description={`${total} ${total === 1 ? "conta cadastrada" : "contas cadastradas"}. Perfis de acesso determinam o que cada pessoa pode fazer no sistema.`}
    >
      <div className="max-w-md">
        <AdminSearch
          placeholder="Buscar por nome, e-mail ou matrícula"
          defaultValue={term}
        />
      </div>

      <div className="mt-6">
        {users.length === 0 ? (
          <EmptyState
            title="Nenhuma conta encontrada"
            description="Ajuste os termos da busca."
          />
        ) : (
          <AdminTable
            caption="Contas cadastradas"
            head={
              <>
                <Th>Pessoa</Th>
                <Th>Vínculo</Th>
                <Th className="text-center">Reservas ativas / total</Th>
                <Th>Cadastro</Th>
                <Th>Perfil de acesso</Th>
                <Th className="text-right">Situação</Th>
              </>
            }
          >
            {users.map((user) => (
              <UserRow
                key={user.id}
                isSelf={user.id === actor.id}
                canChangeRole={can(actor, "user:change-role")}
                canManage={can(actor, "user:manage")}
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  active: user.active,
                  patronType: user.patronType,
                  registrationId: user.registrationId,
                  createdAt: user.createdAt,
                  activeReservations: user.reservations.length,
                  totalReservations: user._count.reservations,
                }}
              />
            ))}
          </AdminTable>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={buildHref}
        className="mt-8"
      />
    </AdminPage>
  );
}
