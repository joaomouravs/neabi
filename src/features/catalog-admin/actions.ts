"use server";

import { revalidatePath } from "next/cache";

import { CopyStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/text";
import { requirePermission } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { generateCopyCode } from "@/server/services/book-service";
import { OCCUPYING_STATUSES } from "@/server/services/reservation-rules";
import {
  categorySchema,
  physicalCopySchema,
  updateCategorySchema,
  updatePhysicalCopySchema,
} from "@/validators/book";

/**
 * Exemplares físicos e categorias.
 */

// ---------------------------------------------------------------------------
// Exemplares
// ---------------------------------------------------------------------------

export async function createCopyAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("copy:manage");

    const parsed = physicalCopySchema.safeParse({
      bookId: formData.get("bookId"),
      code: formData.get("code") ?? "",
      patrimonyCode: formData.get("patrimonyCode") ?? "",
      location: formData.get("location") ?? "",
      shelf: formData.get("shelf") ?? "",
      condition: formData.get("condition") || null,
      status: formData.get("status") ?? CopyStatus.AVAILABLE,
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const book = await prisma.book.findUnique({
      where: { id: parsed.data.bookId },
      select: { id: true, slug: true },
    });
    if (!book) throw new NotFoundError("Obra não encontrada.");

    const code =
      parsed.data.code && parsed.data.code.length > 0
        ? parsed.data.code
        : await generateCopyCode(book.slug);

    const existing = await prisma.physicalCopy.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError("Já existe um exemplar com este código.", "code");
    }

    const copy = await prisma.physicalCopy.create({
      data: {
        bookId: book.id,
        code,
        // Número de tombo permanece nulo até o NEABI informar — nunca gerado.
        patrimonyCode: parsed.data.patrimonyCode,
        location: parsed.data.location,
        shelf: parsed.data.shelf,
        condition: parsed.data.condition ?? null,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
      select: { id: true },
    });

    revalidateCopies(book.slug, book.id);
    return actionOk(copy);
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCopyAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("copy:manage");

    const parsed = updatePhysicalCopySchema.safeParse({
      id: formData.get("id"),
      code: formData.get("code") ?? "",
      patrimonyCode: formData.get("patrimonyCode") ?? "",
      location: formData.get("location") ?? "",
      shelf: formData.get("shelf") ?? "",
      condition: formData.get("condition") || null,
      status: formData.get("status") ?? CopyStatus.AVAILABLE,
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const copy = await prisma.physicalCopy.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        code: true,
        status: true,
        book: { select: { id: true, slug: true } },
      },
    });
    if (!copy) throw new NotFoundError("Exemplar não encontrado.");

    // Um exemplar comprometido por reserva ativa não pode ser marcado como
    // disponível por engano: isso o prometeria a duas pessoas.
    if (
      parsed.data.status === CopyStatus.AVAILABLE &&
      copy.status !== CopyStatus.AVAILABLE
    ) {
      const active = await prisma.reservation.count({
        where: { copyId: copy.id, status: { in: [...OCCUPYING_STATUSES] } },
      });
      if (active > 0) {
        throw new ConflictError(
          "Este exemplar está vinculado a uma reserva ativa. Conclua ou cancele a reserva antes de liberá-lo.",
          "status",
        );
      }
    }

    if (parsed.data.code && parsed.data.code !== copy.code) {
      const duplicate = await prisma.physicalCopy.findUnique({
        where: { code: parsed.data.code },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictError("Já existe um exemplar com este código.", "code");
      }
    }

    await prisma.physicalCopy.update({
      where: { id: copy.id },
      data: {
        code: parsed.data.code || copy.code,
        patrimonyCode: parsed.data.patrimonyCode,
        location: parsed.data.location,
        shelf: parsed.data.shelf,
        condition: parsed.data.condition ?? null,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
    });

    revalidateCopies(copy.book.slug, copy.book.id);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCopyAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("copy:manage");

    const id = String(formData.get("id") ?? "");
    if (!id) throw new ValidationError("Exemplar não identificado.");

    const copy = await prisma.physicalCopy.findUnique({
      where: { id },
      select: {
        id: true,
        book: { select: { id: true, slug: true } },
        _count: { select: { reservations: true } },
      },
    });
    if (!copy) throw new NotFoundError("Exemplar não encontrado.");

    if (copy._count.reservations > 0) {
      throw new ConflictError(
        "Este exemplar possui histórico de reservas e não pode ser excluído. Marque-o como indisponível ou extraviado.",
      );
    }

    await prisma.physicalCopy.delete({ where: { id } });
    revalidateCopies(copy.book.slug, copy.book.id);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

function revalidateCopies(slug: string, bookId: string): void {
  revalidatePath("/admin/exemplares");
  revalidatePath(`/admin/acervo/${bookId}`);
  revalidatePath(`/acervo/${slug}`);
  revalidatePath("/acervo");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function createCategoryAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("category:manage");

    const parsed = categorySchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug") ?? "",
      description: formData.get("description") ?? "",
      sortOrder: formData.get("sortOrder") ?? 0,
      featured: formData.get("featured") === "on",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError("Já existe uma categoria com este endereço.", "slug");
    }

    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder,
        featured: parsed.data.featured,
      },
      select: { id: true },
    });

    revalidateCategories();
    return actionOk(category);
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategoryAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("category:manage");

    const parsed = updateCategorySchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      slug: formData.get("slug") ?? "",
      description: formData.get("description") ?? "",
      sortOrder: formData.get("sortOrder") ?? 0,
      featured: formData.get("featured") === "on",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const duplicate = await prisma.category.findFirst({
      where: { slug, id: { not: parsed.data.id } },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictError("Já existe uma categoria com este endereço.", "slug");
    }

    await prisma.category.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder,
        featured: parsed.data.featured,
      },
    });

    revalidateCategories();
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCategoryAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("category:manage");

    const id = String(formData.get("id") ?? "");
    if (!id) throw new ValidationError("Categoria não identificada.");

    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, _count: { select: { books: true } } },
    });
    if (!category) throw new NotFoundError("Categoria não encontrada.");

    if (category._count.books > 0) {
      throw new ConflictError(
        `Esta categoria está associada a ${category._count.books} obra(s). Remova a associação antes de excluí-la.`,
      );
    }

    await prisma.category.delete({ where: { id } });
    revalidateCategories();
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

function revalidateCategories(): void {
  revalidatePath("/admin/categorias");
  revalidatePath("/acervo");
  revalidatePath("/");
}
