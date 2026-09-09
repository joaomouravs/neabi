import { createHash } from "node:crypto";

import {
  AssetKind,
  BookStatus,
  ContributorRole,
  CopyStatus,
  Prisma,
} from "@/generated/prisma/client";
import { materialTypeLabels } from "@/config/catalog";
import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";
import { normalizeText, slugify } from "@/lib/text";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { slugExists } from "@/server/repositories/book-repository";
import type { BookFormValues } from "@/validators/book";

import { composeSearchText } from "./search-text";

/**
 * Serviço do acervo.
 *
 * Concentra o que não é consulta pura: geração de slug, manutenção do índice
 * de busca, criação de autoridades (pessoas, instituições, assuntos, tags) a
 * partir de nomes digitados, e a regra de que `digitalAvailable` só é `true`
 * quando existe um arquivo autorizado.
 */

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Autoridades: criadas sob demanda, reaproveitadas por slug
// ---------------------------------------------------------------------------

async function resolvePerson(tx: Tx, name: string): Promise<string> {
  const slug = slugify(name);
  const person = await tx.person.upsert({
    where: { slug },
    create: { name: name.trim(), slug },
    update: {},
    select: { id: true },
  });
  return person.id;
}

async function resolveInstitution(
  tx: Tx,
  name: string | null,
): Promise<string | null> {
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;
  const institution = await tx.institution.upsert({
    where: { slug },
    create: { name: name.trim(), slug },
    update: {},
    select: { id: true },
  });
  return institution.id;
}

async function resolveTags(tx: Tx, names: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const tag = await tx.tag.upsert({
      where: { slug },
      create: { name: name.trim(), slug },
      update: {},
      select: { id: true },
    });
    ids.push(tag.id);
  }
  return ids;
}

async function resolveSubjects(
  tx: Tx,
  names: readonly string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const subject = await tx.subject.upsert({
      where: { slug },
      create: { name: name.trim(), slug },
      update: {},
      select: { id: true },
    });
    ids.push(subject.id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

/** Gera um slug único a partir do título, com sufixo numérico quando colide. */
export async function generateUniqueSlug(
  title: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(title) || "obra";
  let candidate = base;
  let counter = 2;
  while (await slugExists(candidate, exceptId)) {
    candidate = `${base}-${counter}`;
    counter += 1;
    if (counter > 200) {
      throw new ConflictError("Não foi possível gerar um endereço único.");
    }
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Índice de busca
// ---------------------------------------------------------------------------

/** Recalcula `searchText` a partir do estado atual da obra no banco. */
export async function refreshSearchText(
  tx: Tx,
  bookId: string,
): Promise<void> {
  const book = await tx.book.findUnique({
    where: { id: bookId },
    select: {
      title: true,
      subtitle: true,
      collection: true,
      description: true,
      summary: true,
      isbn: true,
      year: true,
      edition: true,
      materialType: true,
      publisher: { select: { name: true, acronym: true } },
      institution: { select: { name: true, acronym: true } },
      contributors: { select: { person: { select: { name: true } } } },
      categories: { select: { category: { select: { name: true } } } },
      subjects: { select: { subject: { select: { name: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (!book) return;

  const searchText = composeSearchText({
    title: book.title,
    subtitle: book.subtitle,
    collection: book.collection,
    description: book.description,
    summary: book.summary,
    isbn: book.isbn,
    year: book.year,
    edition: book.edition,
    materialType: materialTypeLabels[book.materialType],
    publisher: [book.publisher?.name, book.publisher?.acronym]
      .filter(Boolean)
      .join(" "),
    institution: [book.institution?.name, book.institution?.acronym]
      .filter(Boolean)
      .join(" "),
    contributors: book.contributors.map((entry) => entry.person.name),
    categories: book.categories.map((entry) => entry.category.name),
    subjects: book.subjects.map((entry) => entry.subject.name),
    tags: book.tags.map((entry) => entry.tag.name),
  });

  await tx.book.update({ where: { id: bookId }, data: { searchText } });
}

// ---------------------------------------------------------------------------
// Criação e atualização
// ---------------------------------------------------------------------------

async function applyRelations(
  tx: Tx,
  bookId: string,
  data: BookFormValues,
): Promise<void> {
  // Colaboradores: substituição completa, preservando a ordem informada.
  await tx.bookContributor.deleteMany({ where: { bookId } });
  const seen = new Set<string>();
  let sortOrder = 0;
  for (const contributor of data.contributors) {
    const personId = await resolvePerson(tx, contributor.name);
    const key = `${personId}:${contributor.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await tx.bookContributor.create({
      data: {
        bookId,
        personId,
        role: contributor.role as ContributorRole,
        sortOrder,
      },
    });
    sortOrder += 1;
  }

  await tx.bookCategory.deleteMany({ where: { bookId } });
  if (data.categoryIds.length > 0) {
    await tx.bookCategory.createMany({
      data: data.categoryIds.map((categoryId) => ({ bookId, categoryId })),
      skipDuplicates: true,
    });
  }

  await tx.bookTag.deleteMany({ where: { bookId } });
  const tagIds = await resolveTags(tx, data.tagNames);
  if (tagIds.length > 0) {
    await tx.bookTag.createMany({
      data: tagIds.map((tagId) => ({ bookId, tagId })),
      skipDuplicates: true,
    });
  }

  await tx.bookSubject.deleteMany({ where: { bookId } });
  const subjectIds = await resolveSubjects(tx, data.subjectNames);
  if (subjectIds.length > 0) {
    await tx.bookSubject.createMany({
      data: subjectIds.map((subjectId) => ({ bookId, subjectId })),
      skipDuplicates: true,
    });
  }
}

export async function createBook(data: BookFormValues): Promise<{ id: string; slug: string }> {
  const slug =
    data.slug && data.slug.length > 0
      ? data.slug
      : await generateUniqueSlug(data.title);

  if (await slugExists(slug)) {
    throw new ConflictError("Já existe uma obra com este endereço.", "slug");
  }

  return prisma.$transaction(async (tx) => {
    const publisherId = await resolveInstitution(tx, data.publisherName);
    const institutionId = await resolveInstitution(tx, data.institutionName);

    const book = await tx.book.create({
      data: {
        slug,
        title: data.title,
        subtitle: data.subtitle,
        publisherId,
        institutionId,
        collection: data.collection,
        year: data.year,
        edition: data.edition,
        language: data.language,
        pages: data.pages,
        isbn: data.isbn,
        materialType: data.materialType,
        catalogingStatus: data.catalogingStatus,
        description: data.description,
        summary: data.summary,
        notes: data.notes,
        coverAlt: data.coverAlt,
        status: data.status,
        featured: data.featured,
        publishedAt: data.status === BookStatus.PUBLISHED ? new Date() : null,
      },
      select: { id: true, slug: true },
    });

    await applyRelations(tx, book.id, data);
    await refreshSearchText(tx, book.id);

    return book;
  });
}

export async function updateBook(
  id: string,
  data: BookFormValues,
): Promise<{ id: string; slug: string }> {
  const existing = await prisma.book.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!existing) throw new NotFoundError("Obra não encontrada.");

  const slug =
    data.slug && data.slug.length > 0 ? data.slug : existing.slug;

  if (slug !== existing.slug && (await slugExists(slug, id))) {
    throw new ConflictError("Já existe uma obra com este endereço.", "slug");
  }

  return prisma.$transaction(async (tx) => {
    const publisherId = await resolveInstitution(tx, data.publisherName);
    const institutionId = await resolveInstitution(tx, data.institutionName);

    const becomingPublished =
      data.status === BookStatus.PUBLISHED && existing.publishedAt === null;

    const book = await tx.book.update({
      where: { id },
      data: {
        slug,
        title: data.title,
        subtitle: data.subtitle,
        publisherId,
        institutionId,
        collection: data.collection,
        year: data.year,
        edition: data.edition,
        language: data.language,
        pages: data.pages,
        isbn: data.isbn,
        materialType: data.materialType,
        catalogingStatus: data.catalogingStatus,
        description: data.description,
        summary: data.summary,
        notes: data.notes,
        coverAlt: data.coverAlt,
        status: data.status,
        featured: data.featured,
        ...(becomingPublished ? { publishedAt: new Date() } : {}),
      },
      select: { id: true, slug: true },
    });

    await applyRelations(tx, book.id, data);
    await refreshSearchText(tx, book.id);

    return book;
  });
}

export async function setBookStatus(
  id: string,
  status: BookStatus,
): Promise<void> {
  const book = await prisma.book.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  if (!book) throw new NotFoundError("Obra não encontrada.");

  await prisma.book.update({
    where: { id },
    data: {
      status,
      ...(status === BookStatus.PUBLISHED && book.publishedAt === null
        ? { publishedAt: new Date() }
        : {}),
    },
  });
}

/**
 * Exclusão definitiva. Recusada quando existem reservas associadas: o histórico
 * de atendimento do NEABI não pode desaparecer junto com a obra — nesse caso a
 * ação correta é arquivar.
 */
export async function deleteBook(id: string): Promise<void> {
  const reservations = await prisma.reservation.count({ where: { bookId: id } });
  if (reservations > 0) {
    throw new ConflictError(
      "Esta obra possui reservas registradas e não pode ser excluída. Arquive-a para retirá-la do catálogo.",
    );
  }
  await prisma.book.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Disponibilidade digital
// ---------------------------------------------------------------------------

/**
 * Reconcilia `Book.digitalAvailable` com os arquivos realmente cadastrados.
 *
 * O campo existe para permitir filtro e ordenação eficientes, mas nunca é
 * definido à mão: é sempre derivado da existência de um PDF autorizado.
 */
export async function syncDigitalAvailability(
  bookId: string,
  client: Tx | typeof prisma = prisma,
): Promise<boolean> {
  const authorized = await client.digitalAsset.count({
    where: { bookId, kind: AssetKind.PDF, authorized: true },
  });
  const digitalAvailable = authorized > 0;
  await client.book.update({
    where: { id: bookId },
    data: { digitalAvailable },
  });
  return digitalAvailable;
}

// ---------------------------------------------------------------------------
// Exemplares físicos
// ---------------------------------------------------------------------------

/**
 * Código interno do exemplar. Não é número de tombo: o tombo é atribuído pelo
 * NEABI e permanece `null` até ser informado.
 */
export async function generateCopyCode(bookSlug: string): Promise<string> {
  const prefix = bookSlug.slice(0, 24).toUpperCase().replace(/-/g, "");
  for (let sequence = 1; sequence <= 999; sequence += 1) {
    const code = `${prefix}-${String(sequence).padStart(3, "0")}`;
    const exists = await prisma.physicalCopy.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new ConflictError("Não foi possível gerar um código de exemplar.");
}

export async function assertCopyBelongsToBook(
  copyId: string,
  bookId: string,
): Promise<void> {
  const copy = await prisma.physicalCopy.findUnique({
    where: { id: copyId },
    select: { bookId: true, status: true },
  });
  if (!copy) throw new NotFoundError("Exemplar não encontrado.");
  if (copy.bookId !== bookId) {
    throw new ValidationError("O exemplar não pertence a esta obra.", "copyId");
  }
}

// ---------------------------------------------------------------------------
// Registro de acessos
// ---------------------------------------------------------------------------

/**
 * Contabiliza uma visualização.
 *
 * O visitante é identificado por um hash irreversível — nunca guardamos IP em
 * texto claro. Falhas aqui não podem quebrar a página da obra, então o erro é
 * registrado e engolido.
 */
export async function recordBookView(
  bookId: string,
  options: { userId?: string | null; visitorSeed?: string | null } = {},
): Promise<void> {
  try {
    const visitorHash = options.visitorSeed
      ? createHash("sha256")
          .update(`${options.visitorSeed}:${bookId}`)
          .digest("hex")
          .slice(0, 32)
      : null;

    await prisma.$transaction([
      prisma.book.update({
        where: { id: bookId },
        data: { viewCount: { increment: 1 } },
      }),
      prisma.bookView.create({
        data: { bookId, userId: options.userId ?? null, visitorHash },
      }),
    ]);
  } catch (error) {
    // Analytics nunca derruba a página da obra: a leitura é o serviço, a
    // contagem é acessória.
    logger.warn("Falha ao registrar visualização", { bookId, error });
  }
}

export async function recordSearchEvent(
  query: string,
  resultCount: number,
  userId?: string | null,
): Promise<void> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return;
  try {
    await prisma.searchEvent.create({
      data: {
        query: trimmed.slice(0, 160),
        normalizedQuery: normalizeText(trimmed).slice(0, 160),
        resultCount,
        userId: userId ?? null,
      },
    });
  } catch (error) {
    logger.warn("Falha ao registrar evento de busca", { error });
  }
}

export { CopyStatus };
