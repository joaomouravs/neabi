import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPage, AdminSection } from "@/components/admin/admin-ui";
import { AssetsManager } from "@/components/admin/assets-manager";
import { BookForm } from "@/components/admin/book-form";
import { CopiesManager } from "@/components/admin/copies-manager";
import { BookStatusActions } from "@/components/admin/book-status-actions";
import { Badge } from "@/components/ui/badge";
import { bookStatusLabels } from "@/config/catalog";
import { formatDateTime } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/permissions/rbac";

type Params = Promise<{ id: string }>;

export default async function EditBookPage({ params }: { params: Params }) {
  const [{ id }, actor] = await Promise.all([
    params,
    requirePermission("book:update"),
  ]);

  const [book, categories] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        collection: true,
        year: true,
        edition: true,
        language: true,
        pages: true,
        isbn: true,
        materialType: true,
        catalogingStatus: true,
        description: true,
        summary: true,
        notes: true,
        coverImage: true,
        coverAlt: true,
        status: true,
        featured: true,
        viewCount: true,
        digitalAvailable: true,
        updatedAt: true,
        publisher: { select: { name: true } },
        institution: { select: { name: true } },
        contributors: {
          select: { role: true, person: { select: { name: true } } },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        categories: { select: { categoryId: true } },
        subjects: { select: { subject: { select: { name: true } } } },
        tags: { select: { tag: { select: { name: true } } } },
        copies: {
          select: {
            id: true,
            code: true,
            patrimonyCode: true,
            location: true,
            shelf: true,
            condition: true,
            status: true,
            notes: true,
          },
          orderBy: { code: "asc" },
        },
        assets: {
          select: {
            id: true,
            kind: true,
            storageKey: true,
            fileName: true,
            mimeType: true,
            size: true,
            authorized: true,
            downloadAllowed: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reservations: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!book) notFound();

  return (
    <AdminPage
      title={book.title}
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Badge
            variant={book.status === "PUBLISHED" ? "green" : "neutral"}
            size="sm"
          >
            {bookStatusLabels[book.status]}
          </Badge>
          <span className="text-[0.8125rem] text-ink-500">
            {book.viewCount} {book.viewCount === 1 ? "acesso" : "acessos"} ·{" "}
            {book._count.reservations}{" "}
            {book._count.reservations === 1 ? "reserva" : "reservas"} ·
            atualizada em {formatDateTime(book.updatedAt)}
          </span>
          {book.status === "PUBLISHED" ? (
            <Link
              href={`/acervo/${book.slug}`}
              className="text-[0.8125rem] font-semibold text-neabi-red-600 underline underline-offset-4"
            >
              Ver no site
            </Link>
          ) : null}
        </span>
      }
      breadcrumb={{ href: "/admin/acervo", label: "Voltar para o acervo" }}
      action={
        <BookStatusActions
          bookId={book.id}
          status={book.status}
          canDelete={can(actor, "book:delete")}
        />
      }
    >
      {/*
        `grid-cols-1` não é decorativo: sem ele a coluna implícita do celular é
        dimensionada pelo conteúdo, e a tabela de exemplares (`min-w-[42rem]`)
        estica a coluna inteira — a página passa a rolar para o lado em vez de a
        tabela rolar dentro do próprio contêiner.
      */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <AdminSection
          title="Catalogação"
          description="Registre apenas o que estiver visível no exemplar."
        >
          <BookForm
            mode="edit"
            categories={categories}
            defaults={{
              id: book.id,
              title: book.title,
              subtitle: book.subtitle ?? "",
              slug: book.slug,
              publisherName: book.publisher?.name ?? "",
              institutionName: book.institution?.name ?? "",
              collection: book.collection ?? "",
              year: book.year ? String(book.year) : "",
              edition: book.edition ?? "",
              language: book.language ?? "",
              pages: book.pages ? String(book.pages) : "",
              isbn: book.isbn ?? "",
              materialType: book.materialType,
              catalogingStatus: book.catalogingStatus,
              description: book.description ?? "",
              summary: book.summary ?? "",
              notes: book.notes ?? "",
              contributors: book.contributors.map((entry) => ({
                name: entry.person.name,
                role: entry.role,
              })),
              categoryIds: book.categories.map((entry) => entry.categoryId),
              tagNames: book.tags.map((entry) => entry.tag.name).join(", "),
              subjectNames: book.subjects
                .map((entry) => entry.subject.name)
                .join(", "),
              status: book.status,
              featured: book.featured,
              coverAlt: book.coverAlt ?? "",
            }}
          />
        </AdminSection>

        <div className="flex flex-col gap-6">
          <AdminSection
            title="Exemplares físicos"
            description="A disponibilidade da obra no site é calculada a partir destes registros."
          >
            <CopiesManager bookId={book.id} copies={book.copies} />
          </AdminSection>

          <AdminSection title="Arquivos">
            <AssetsManager
              bookId={book.id}
              bookTitle={book.title}
              coverImage={book.coverImage}
              assets={book.assets}
              canAuthorize={can(actor, "asset:authorize")}
              canDelete={can(actor, "asset:delete")}
            />
          </AdminSection>
        </div>
      </div>
    </AdminPage>
  );
}
