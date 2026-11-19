import { AdminPage } from "@/components/admin/admin-ui";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { requirePagePermission } from "@/server/auth/session";
import { listCategories } from "@/server/repositories/taxonomy-repository";

export default async function AdminCategoriesPage() {
  await requirePagePermission("category:manage");

  const categories = await listCategories();

  return (
    <AdminPage
      title="Categorias"
      description="Eixos de navegação do acervo. As categorias marcadas como destaque viram filtros rápidos na página do acervo."
    >
      <CategoriesManager
        categories={categories.map(({ _count, ...category }) => ({
          ...category,
          bookCount: _count.books,
        }))}
      />
    </AdminPage>
  );
}
