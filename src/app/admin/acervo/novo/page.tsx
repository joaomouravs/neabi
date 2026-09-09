import { AdminPage } from "@/components/admin/admin-ui";
import { BookForm } from "@/components/admin/book-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";

export default async function NewBookPage() {
  await requirePermission("book:create");

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <AdminPage
      title="Cadastrar obra"
      description="Registre apenas o que estiver visível no exemplar. Campos bibliográficos desconhecidos ficam vazios e a obra permanece marcada para revisão."
      breadcrumb={{ href: "/admin/acervo", label: "Voltar para o acervo" }}
    >
      <div className="max-w-3xl">
        <BookForm
          mode="create"
          categories={categories}
          defaults={{
            title: "",
            subtitle: "",
            slug: "",
            publisherName: "",
            institutionName: "",
            collection: "",
            year: "",
            edition: "",
            language: "",
            pages: "",
            isbn: "",
            materialType: "BOOK",
            catalogingStatus: "NEEDS_REVIEW",
            description: "",
            summary: "",
            notes: "",
            contributors: [],
            categoryIds: [],
            tagNames: "",
            subjectNames: "",
            status: "DRAFT",
            featured: false,
            coverAlt: "",
          }}
        />
      </div>
    </AdminPage>
  );
}
