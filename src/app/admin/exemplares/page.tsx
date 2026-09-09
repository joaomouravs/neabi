import Link from "next/link";

import { AdminPage, AdminTable, StatCard, Td, Th } from "@/components/admin/admin-ui";
import { AdminSearch } from "@/components/admin/admin-search";
import { Pagination } from "@/components/catalog/pagination";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { copyConditionLabels, copyStatusLabels } from "@/config/catalog";
import { ADMIN_PAGE_SIZE } from "@/config/site";
import { CopyStatus, Prisma } from "@/generated/prisma/client";
import { escapeLike, normalizeText } from "@/lib/text";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminCopiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("copy:manage");

  const raw = await searchParams;
  const single = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const term = (single("q") ?? "").trim();
  const status = single("status");
  const page = Math.max(1, Number(single("page") ?? 1) || 1);

  const where: Prisma.PhysicalCopyWhereInput = {
    ...(status && Object.values(CopyStatus).includes(status as CopyStatus)
      ? { status: status as CopyStatus }
      : {}),
    ...(term.length > 0
      ? {
          OR: [
            { code: { contains: escapeLike(term), mode: "insensitive" } },
            {
              patrimonyCode: { contains: escapeLike(term), mode: "insensitive" },
            },
            { book: { searchText: { contains: escapeLike(normalizeText(term)) } } },
          ],
        }
      : {}),
  };

  const [copies, total, byStatus] = await Promise.all([
    prisma.physicalCopy.findMany({
      where,
      select: {
        id: true,
        code: true,
        patrimonyCode: true,
        location: true,
        shelf: true,
        condition: true,
        status: true,
        book: { select: { id: true, title: true, slug: true } },
      },
      orderBy: [{ book: { title: "asc" } }, { code: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.physicalCopy.count({ where }),
    prisma.physicalCopy.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(
    byStatus.map((row) => [row.status, row._count._all]),
  ) as Record<CopyStatus, number | undefined>;

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: term, status, page, ...overrides })) {
      if (value === undefined || value === "" || value === null) continue;
      if (key === "page" && Number(value) === 1) continue;
      search.set(key, String(value));
    }
    const query = search.toString();
    return `/admin/exemplares${query ? `?${query}` : ""}`;
  };

  return (
    <AdminPage
      title="Exemplares"
      description="Todos os exemplares físicos do acervo. A disponibilidade pública é calculada a partir desta tabela."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Object.values(CopyStatus).map((value) => (
          <StatCard
            key={value}
            label={copyStatusLabels[value]}
            value={counts[value] ?? 0}
            tone={
              value === CopyStatus.AVAILABLE
                ? "green"
                : value === CopyStatus.LOST
                  ? "red"
                  : "neutral"
            }
            href={buildHref({ status: value, page: 1 })}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="max-w-md">
          <AdminSearch
            placeholder="Buscar por código, tombo ou obra"
            defaultValue={term}
          />
        </div>
        {status ? (
          <p className="text-[0.875rem] text-ink-600">
            Filtrando por{" "}
            <strong>{copyStatusLabels[status as CopyStatus]}</strong>.{" "}
            <Link
              href={buildHref({ status: undefined, page: 1 })}
              className="text-neabi-red-600 underline underline-offset-4"
            >
              Remover filtro
            </Link>
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        {copies.length === 0 ? (
          <EmptyState
            title="Nenhum exemplar encontrado"
            description="Ajuste a busca ou o filtro de situação."
          />
        ) : (
          <AdminTable
            caption="Exemplares físicos do acervo"
            head={
              <>
                <Th>Código</Th>
                <Th>Obra</Th>
                <Th>Tombo</Th>
                <Th>Localização</Th>
                <Th>Conservação</Th>
                <Th>Situação</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </>
            }
          >
            {copies.map((copy) => (
              <tr key={copy.id} className="hover:bg-surface-muted">
                <Td className="whitespace-nowrap font-mono text-[0.8125rem]">
                  {copy.code}
                </Td>
                <Td className="max-w-72">
                  <Link
                    href={`/admin/acervo/${copy.book.id}`}
                    className="line-clamp-2 font-medium text-ink-900 hover:text-neabi-red-700"
                  >
                    {copy.book.title}
                  </Link>
                </Td>
                <Td className="text-ink-600">
                  {copy.patrimonyCode ?? <span className="text-ink-400">—</span>}
                </Td>
                <Td className="text-ink-600">
                  {[copy.location, copy.shelf].filter(Boolean).join(" · ") || (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>
                <Td className="text-ink-600">
                  {copy.condition ? (
                    copyConditionLabels[copy.condition]
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>
                <Td>
                  <Badge
                    variant={
                      copy.status === CopyStatus.AVAILABLE
                        ? "green"
                        : copy.status === CopyStatus.LOST
                          ? "red"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {copyStatusLabels[copy.status]}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <Link
                    href={`/admin/acervo/${copy.book.id}`}
                    className="text-[0.8125rem] font-semibold text-neabi-red-600 underline underline-offset-4"
                  >
                    Gerenciar
                  </Link>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(target) => buildHref({ page: target })}
        className="mt-8"
      />
    </AdminPage>
  );
}
