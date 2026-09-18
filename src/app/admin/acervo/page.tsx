import { Library, Plus } from "lucide-react";
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
import { BookCover } from "@/components/books/book-cover";
import { Pagination } from "@/components/catalog/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { bookStatusLabels, materialTypeLabels } from "@/config/catalog";
import { ADMIN_PAGE_SIZE } from "@/config/site";
import { BookStatus, CatalogingStatus, CopyStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { escapeLike, normalizeText } from "@/lib/text";
import { requirePermission } from "@/server/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_TABS = [
  { value: "", label: "Todas" },
  { value: BookStatus.PUBLISHED, label: "Publicadas" },
  { value: BookStatus.DRAFT, label: "Rascunhos" },
  { value: BookStatus.ARCHIVED, label: "Arquivadas" },
] as const;

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("book:read:any");

  const params = await searchParams;
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const term = (single("q") ?? "").trim();
  const status = single("status");
  const cataloging = single("cataloging");
  const page = Math.max(1, Number(single("page") ?? 1) || 1);
  // A listagem acompanha o catálogo público: A→Z por padrão, porque procurar
  // uma obra pelo título é o que mais se faz aqui. Quem está catalogando pode
  // trocar para a ordem de edição com um clique.
  const recentFirst = single("ordem") === "recentes";

  const where = {
    ...(status && Object.values(BookStatus).includes(status as BookStatus)
      ? { status: status as BookStatus }
      : {}),
    ...(cataloging && Object.values(CatalogingStatus).includes(cataloging as CatalogingStatus)
      ? { catalogingStatus: cataloging as CatalogingStatus }
      : {}),
    ...(term.length > 0 ? { searchText: { contains: escapeLike(normalizeText(term)) } } : {}),
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        status: true,
        materialType: true,
        catalogingStatus: true,
        year: true,
        updatedAt: true,
        coverImage: true,
        coverAlt: true,
        _count: { select: { copies: true, reservations: true } },
        copies: { where: { status: CopyStatus.AVAILABLE }, select: { id: true } },
        contributors: {
          select: { person: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
          take: 2,
        },
      },
      orderBy: recentFirst
        ? [{ updatedAt: "desc" }, { id: "asc" }]
        : [{ sortTitle: "asc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.book.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    const merged = {
      q: term,
      status,
      cataloging,
      ordem: recentFirst ? "recentes" : undefined,
      page,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "" || value === null) continue;
      if (key === "page" && Number(value) === 1) continue;
      search.set(key, String(value));
    }
    const query = search.toString();
    return `/admin/acervo${query ? `?${query}` : ""}`;
  };

  const needsReviewActive = cataloging === CatalogingStatus.NEEDS_REVIEW;

  return (
    <AdminPage
      eyebrow="Acervo"
      title="Acervo"
      description={`${total} ${total === 1 ? "obra cadastrada" : "obras cadastradas"}.`}
      action={
        <Button asChild>
          <Link href="/admin/acervo/novo">
            <Plus aria-hidden="true" />
            Cadastrar obra
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="max-w-xl">
          <AdminSearch
            placeholder="Buscar por título, autoria, editora, assunto ou ISBN"
            defaultValue={term}
          />
        </div>

        <AdminFilterTabs
          label="Filtrar obras"
          items={[
            ...STATUS_TABS.map((tab) => ({
              href: buildHref({ status: tab.value || undefined, page: 1 }),
              label: tab.label,
              active: (status ?? "") === tab.value,
            })),
            {
              href: buildHref({
                cataloging: needsReviewActive ? undefined : CatalogingStatus.NEEDS_REVIEW,
                page: 1,
              }),
              label: "Dados incompletos",
              active: needsReviewActive,
              tone: "amber" as const,
            },
          ]}
        />

        <p className="text-[0.8125rem] text-ink-600">
          {recentFirst ? "Ordenadas pela última edição." : "Ordenadas de A a Z pelo título."}{" "}
          <Link
            href={buildHref({ ordem: recentFirst ? undefined : "recentes", page: 1 })}
            className={adminLinkClass}
          >
            {recentFirst ? "Ordenar de A a Z" : "Ordenar pela última edição"}
          </Link>
        </p>
      </div>

      <div className="mt-6">
        {books.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Nenhuma obra encontrada"
            description="Ajuste a busca ou os filtros, ou cadastre uma nova obra."
            action={
              <Button asChild>
                <Link href="/admin/acervo/novo">Cadastrar obra</Link>
              </Button>
            }
          />
        ) : (
          <AdminTable
            caption="Obras cadastradas no acervo"
            head={
              <>
                <Th>Obra</Th>
                <Th>Tipo</Th>
                <Th className="text-center">Exemplares</Th>
                <Th>Situação</Th>
                <Th>Atualizada</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </>
            }
          >
            {books.map((book) => (
              <tr key={book.id} className="transition-colors hover:bg-surface-muted">
                <Td className="max-w-md">
                  <div className="flex items-start gap-3">
                    {/*
                      Miniatura da capa: conferir a que obra pertence cada
                      fotografia é trabalho de catalogação, e fazê-lo exige
                      vê-la aqui, ao lado do título.
                    */}
                    <div className="w-10 shrink-0 sm:w-12">
                      <BookCover
                        title={book.title}
                        coverImage={book.coverImage}
                        coverAlt={book.coverAlt}
                        sizes="48px"
                        className="border border-border"
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/acervo/${book.id}`}
                        className="font-medium text-ink-900 hover:text-neabi-red-700"
                      >
                        {book.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-500">
                        {[
                          book.subtitle,
                          book.contributors.map((entry) => entry.person.name).join("; "),
                          book.year,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {book.catalogingStatus === CatalogingStatus.NEEDS_REVIEW ? (
                          <Badge variant="amber" size="sm">
                            Dados incompletos
                          </Badge>
                        ) : null}
                        {!book.coverImage ? (
                          <Badge variant="outline" size="sm">
                            Sem capa
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-ink-600">
                  {materialTypeLabels[book.materialType]}
                </Td>
                <Td className="text-center tabular-nums">
                  <span className="text-ink-900">{book.copies.length}</span>
                  <span className="text-ink-500"> / {book._count.copies}</span>
                </Td>
                <Td>
                  <Badge
                    variant={
                      book.status === BookStatus.PUBLISHED
                        ? "green"
                        : book.status === BookStatus.DRAFT
                          ? "neutral"
                          : "outline"
                    }
                    size="sm"
                  >
                    {bookStatusLabels[book.status]}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap text-ink-500">{formatDate(book.updatedAt)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/acervo/${book.id}`} className={adminLinkClass}>
                    Editar
                  </Link>
                  {book.status === BookStatus.PUBLISHED ? (
                    <Link
                      href={`/acervo/${book.slug}`}
                      className="ml-3 text-[0.8125rem] text-ink-600 underline underline-offset-4 hover:text-ink-900"
                    >
                      Ver
                    </Link>
                  ) : null}
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
