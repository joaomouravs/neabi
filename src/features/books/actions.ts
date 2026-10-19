"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AssetKind, BookStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/logger";
import { requirePermission } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  NotFoundError,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import {
  createBook,
  deleteBook,
  setBookStatus,
  syncDigitalAvailability,
  updateBook,
} from "@/server/services/book-service";
import {
  assertValidUpload,
  DOCUMENT_MIME_TYPES,
  getStorage,
  IMAGE_MIME_TYPES,
  uploadLimits,
} from "@/server/storage";
import { bookFormSchema, digitalAssetAuthorizationSchema } from "@/validators/book";

/**
 * Ações administrativas do acervo.
 *
 * Toda ação começa por `requirePermission`: a permissão é verificada no
 * servidor a cada chamada, nunca inferida do que a interface exibiu.
 */

function revalidateBook(slug?: string): void {
  revalidatePath("/admin/acervo");
  revalidatePath("/acervo");
  revalidatePath("/");
  if (slug) revalidatePath(`/acervo/${slug}`);
}

/** Converte o FormData do formulário administrativo no formato do schema. */
function parseBookForm(formData: FormData) {
  const contributorsRaw = String(formData.get("contributors") ?? "[]");

  let contributors: unknown = [];
  try {
    contributors = JSON.parse(contributorsRaw);
  } catch {
    throw new ValidationError("Não foi possível ler a lista de responsáveis.");
  }

  const parsed = bookFormSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") ?? "",
    slug: formData.get("slug") ?? "",
    publisherName: formData.get("publisherName") ?? "",
    institutionName: formData.get("institutionName") ?? "",
    collection: formData.get("collection") ?? "",
    year: formData.get("year") ?? "",
    edition: formData.get("edition") ?? "",
    language: formData.get("language") ?? "",
    pages: formData.get("pages") ?? "",
    isbn: formData.get("isbn") ?? "",
    materialType: formData.get("materialType"),
    catalogingStatus: formData.get("catalogingStatus"),
    description: formData.get("description") ?? "",
    summary: formData.get("summary") ?? "",
    notes: formData.get("notes") ?? "",
    contributors,
    categoryIds: formData.getAll("categoryIds").map(String),
    tagNames: splitList(formData.get("tagNames")),
    subjectNames: splitList(formData.get("subjectNames")),
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    coverAlt: formData.get("coverAlt") ?? "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
  }

  return parsed.data;
}

/** Campos livres aceitam valores separados por vírgula ou quebra de linha. */
function splitList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Cria a obra e leva direto para a tela de edição, onde a equipe cadastra
 * exemplares e arquivos.
 *
 * O redirecionamento acontece no servidor: um efeito no cliente disputaria com
 * a reinicialização do formulário feita pelo React e às vezes não navegaria.
 */
export async function createBookAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  let destination: string | null = null;

  try {
    const actor = await requirePermission("book:create");
    const data = parseBookForm(formData);
    const book = await createBook(data);
    audit("acervo.obra_criada", { bookId: book.id, slug: book.slug, actorId: actor.id });
    revalidateBook(book.slug);
    destination = `/admin/acervo/${book.id}`;
  } catch (error) {
    return actionError(error);
  }

  // Fora do try: `redirect` sinaliza por exceção e não é uma falha.
  redirect(destination);
}

export async function updateBookAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const actor = await requirePermission("book:update");
    const id = String(formData.get("id") ?? "");
    if (!id) throw new ValidationError("Obra não identificada.");

    const data = parseBookForm(formData);
    const book = await updateBook(id, data);

    audit("acervo.obra_atualizada", { bookId: book.id, actorId: actor.id });
    revalidateBook(book.slug);
    revalidatePath(`/admin/acervo/${id}`);
    return actionOk(book);
  } catch (error) {
    return actionError(error);
  }
}

export async function setBookStatusAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const status = String(formData.get("status") ?? "");
    if (!Object.values(BookStatus).includes(status as BookStatus)) {
      throw new ValidationError("Situação inválida.");
    }

    // Publicar/despublicar e arquivar são permissões distintas.
    const actor = await requirePermission(
      status === BookStatus.ARCHIVED ? "book:archive" : "book:publish",
    );

    const id = String(formData.get("id") ?? "");
    if (!id) throw new ValidationError("Obra não identificada.");

    await setBookStatus(id, status as BookStatus);
    audit("acervo.obra_status", { bookId: id, status, actorId: actor.id });

    const book = await prisma.book.findUnique({
      where: { id },
      select: { slug: true },
    });
    revalidateBook(book?.slug);
    revalidatePath(`/admin/acervo/${id}`);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Exclusão definitiva. Como a obra deixa de existir, a navegação de volta à
 * listagem é feita pelo servidor — não faz sentido permanecer numa página cujo
 * registro acabou de ser removido.
 */
export async function deleteBookAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("book:delete");
    const id = String(formData.get("id") ?? "");
    if (!id) throw new ValidationError("Obra não identificada.");

    await deleteBook(id);
    // Exclusão é irreversível: o registro de quem apagou o quê é o único
    // rastro que sobra da obra.
    audit("acervo.obra_removida", { bookId: id, actorId: actor.id });
    revalidateBook();
  } catch (error) {
    return actionError(error);
  }

  redirect("/admin/acervo");
}

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

/**
 * Texto alternativo padrão de uma capa recém-vinculada.
 *
 * Nomeia a obra em vez de dizer "imagem" ou "foto", que nada informam a quem
 * usa leitor de tela. Serve de ponto de partida: a equipe reescreve o texto
 * pelo formulário da obra quando a fotografia pede uma descrição mais precisa.
 */
function coverAltFor(title: string): string {
  return `Capa do livro ${title}`;
}

export async function uploadCoverAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ key: string }>> {
  try {
    const actor = await requirePermission("asset:upload");

    const bookId = String(formData.get("bookId") ?? "");
    const file = formData.get("file");
    if (!bookId) throw new ValidationError("Obra não identificada.");
    if (!(file instanceof File)) throw new ValidationError("Selecione um arquivo.");

    await assertValidUpload(file, {
      allowed: IMAGE_MIME_TYPES,
      maxBytes: uploadLimits().image,
    });

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, slug: true, title: true, coverImage: true },
    });
    if (!book) throw new NotFoundError("Obra não encontrada.");

    const storage = getStorage();
    const stored = await storage.upload({ folder: "capas", file });

    await prisma.$transaction(async (tx) => {
      await tx.digitalAsset.create({
        data: {
          bookId: book.id,
          kind: AssetKind.COVER,
          storageKey: stored.key,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          size: stored.size,
          // Capa é sempre pública; a autorização controla apenas o PDF de leitura.
          authorized: true,
          downloadAllowed: false,
          uploadedById: actor.id,
        },
      });

      await tx.book.update({
        where: { id: book.id },
        data: {
          coverImage: storage.getUrl(stored.key),
          coverAlt: book.coverImage === null ? coverAltFor(book.title) : undefined,
        },
      });
    });

    audit("arquivo.enviado", {
      bookId: book.id,
      kind: AssetKind.COVER,
      mimeType: stored.mimeType,
      size: stored.size,
      actorId: actor.id,
    });

    revalidateBook(book.slug);
    revalidatePath(`/admin/acervo/${book.id}`);
    return actionOk({ key: stored.key });
  } catch (error) {
    audit("arquivo.falha", { operacao: "upload_capa", error });
    return actionError(error);
  }
}

/**
 * Desvincula a capa da obra.
 *
 * Remove **apenas** a capa: `coverImage` e `coverAlt` voltam a ser nulos e a
 * obra passa a aparecer com a ficha do sistema. Nenhum outro dado bibliográfico
 * é tocado, e a obra não é apagada nem despublicada.
 *
 * O arquivo em si só é excluído do storage quando foi enviado pelo painel. As
 * fotografias do acervo inicial ficam versionadas em `public/acervo/capas` e
 * continuam lá: desvincular é uma decisão de catalogação, reversível pelo
 * próximo seed ou por um novo envio, e não um apagamento de arquivo do
 * repositório.
 */
export async function removeCoverAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("asset:delete");

    const bookId = String(formData.get("bookId") ?? "");
    if (!bookId) throw new ValidationError("Obra não identificada.");

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        slug: true,
        coverImage: true,
        assets: {
          where: { kind: AssetKind.COVER },
          select: { id: true, storageKey: true },
        },
      },
    });
    if (!book) throw new NotFoundError("Obra não encontrada.");
    if (!book.coverImage) {
      throw new ValidationError("Esta obra já está sem capa.");
    }

    const storage = getStorage();
    const uploaded = book.assets.find(
      (asset) => storage.getUrl(asset.storageKey) === book.coverImage,
    );

    await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: book.id },
        data: { coverImage: null, coverAlt: null },
      });
      if (uploaded) {
        await tx.digitalAsset.delete({ where: { id: uploaded.id } });
      }
    });

    if (uploaded) await storage.delete(uploaded.storageKey);

    audit("acervo.capa_removida", {
      bookId: book.id,
      arquivoRemovido: Boolean(uploaded),
      actorId: actor.id,
    });

    revalidateBook(book.slug);
    revalidatePath(`/admin/acervo/${book.id}`);
    revalidatePath("/admin/arquivos");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadDocumentAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<{ assetId: string }>> {
  try {
    const actor = await requirePermission("asset:upload");

    const bookId = String(formData.get("bookId") ?? "");
    const file = formData.get("file");
    if (!bookId) throw new ValidationError("Obra não identificada.");
    if (!(file instanceof File)) throw new ValidationError("Selecione um arquivo.");

    await assertValidUpload(file, {
      allowed: DOCUMENT_MIME_TYPES,
      maxBytes: uploadLimits().document,
    });

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, slug: true },
    });
    if (!book) throw new NotFoundError("Obra não encontrada.");

    const stored = await getStorage().upload({ folder: "documentos", file });

    const asset = await prisma.digitalAsset.create({
      data: {
        bookId: book.id,
        kind: AssetKind.PDF,
        storageKey: stored.key,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        size: stored.size,
        // Enviar um PDF NÃO libera consulta digital. A autorização é um ato
        // deliberado e separado, restrito à administração.
        authorized: false,
        downloadAllowed: false,
        uploadedById: actor.id,
      },
      select: { id: true },
    });

    audit("arquivo.enviado", {
      bookId: book.id,
      assetId: asset.id,
      kind: AssetKind.PDF,
      size: stored.size,
      actorId: actor.id,
    });

    revalidateBook(book.slug);
    revalidatePath(`/admin/acervo/${book.id}`);
    return actionOk({ assetId: asset.id });
  } catch (error) {
    audit("arquivo.falha", { operacao: "upload_documento", error });
    return actionError(error);
  }
}

/**
 * Autorização de consulta digital.
 *
 * Restrita a ADMIN (`asset:authorize`): é a decisão que torna um material
 * legível online, e envolve direito autoral e acordo com quem cedeu a obra.
 */
export async function authorizeAssetAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("asset:authorize");

    const parsed = digitalAssetAuthorizationSchema.safeParse({
      assetId: formData.get("assetId"),
      authorized: formData.get("authorized") === "on",
      downloadAllowed: formData.get("downloadAllowed") === "on",
    });
    if (!parsed.success) throw new ValidationError("Dados inválidos.");

    const asset = await prisma.digitalAsset.findUnique({
      where: { id: parsed.data.assetId },
      select: { id: true, bookId: true, kind: true, book: { select: { slug: true } } },
    });
    if (!asset) throw new NotFoundError("Arquivo não encontrado.");
    if (asset.kind !== AssetKind.PDF) {
      throw new ValidationError(
        "Somente documentos PDF podem ser liberados para consulta digital.",
      );
    }

    await prisma.digitalAsset.update({
      where: { id: asset.id },
      data: {
        authorized: parsed.data.authorized,
        // Download só faz sentido com a consulta autorizada.
        downloadAllowed: parsed.data.authorized && parsed.data.downloadAllowed,
      },
    });

    await syncDigitalAvailability(asset.bookId);

    // Liberar consulta digital tem implicação de direito autoral: é a decisão
    // do painel que mais precisa de rastro.
    audit("arquivo.autorizado", {
      assetId: asset.id,
      bookId: asset.bookId,
      authorized: parsed.data.authorized,
      downloadAllowed: parsed.data.authorized && parsed.data.downloadAllowed,
      actorId: actor.id,
    });

    revalidateBook(asset.book.slug);
    revalidatePath(`/admin/acervo/${asset.bookId}`);
    revalidatePath("/admin/arquivos");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteAssetAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("asset:delete");

    const assetId = String(formData.get("assetId") ?? "");
    if (!assetId) throw new ValidationError("Arquivo não identificado.");

    const asset = await prisma.digitalAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        bookId: true,
        kind: true,
        storageKey: true,
        book: { select: { slug: true, coverImage: true } },
      },
    });
    if (!asset) throw new NotFoundError("Arquivo não encontrado.");

    const storage = getStorage();

    await prisma.$transaction(async (tx) => {
      await tx.digitalAsset.delete({ where: { id: asset.id } });

      // Se a capa apagada era a capa vigente da obra, o campo volta a ser nulo
      // — a interface passa a mostrar o cartão tipográfico.
      if (
        asset.kind === AssetKind.COVER &&
        asset.book.coverImage === storage.getUrl(asset.storageKey)
      ) {
        await tx.book.update({
          where: { id: asset.bookId },
          data: { coverImage: null },
        });
      }
    });

    await storage.delete(asset.storageKey);
    await syncDigitalAvailability(asset.bookId);

    revalidateBook(asset.book.slug);
    revalidatePath(`/admin/acervo/${asset.bookId}`);
    revalidatePath("/admin/arquivos");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}
