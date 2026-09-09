import "dotenv/config";

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { materialTypeLabels } from "@/config/catalog";
import { PrismaClient } from "@/generated/prisma/client";
import { slugify } from "@/lib/text";
import { composeSearchText } from "@/server/services/search-text";

import { SEED_BOOKS, SEED_CATEGORIES, type SeedBook } from "./acervo-inicial";

/**
 * Seed da Biblioteca NEABI.
 *
 * Idempotente: rodar duas vezes não duplica nada. Todas as escritas usam
 * `upsert` com chaves naturais (slug, e-mail, código do exemplar).
 *
 * Nenhum dado bibliográfico é inventado — ver `prisma/acervo-inicial.ts`.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Configure o arquivo .env.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    ...(process.env.DATABASE_POOL_MAX
      ? { max: Number(process.env.DATABASE_POOL_MAX) }
      : {}),
  }),
});

const COVERS_DIR = join(process.cwd(), "public", "acervo", "capas");
const COVER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

/**
 * Procura a fotografia da capa em `public/acervo/capas/<slug>.<ext>`.
 *
 * As capas são fotografias do acervo físico real. O seed apenas as **vincula**
 * quando o arquivo existe — nunca gera, redesenha ou substitui imagem alguma.
 * Sem arquivo, `coverImage` fica `null` e a interface mostra um cartão
 * tipográfico de fallback.
 */
function findCoverFor(slug: string): string | null {
  if (!existsSync(COVERS_DIR)) return null;
  for (const extension of COVER_EXTENSIONS) {
    if (existsSync(join(COVERS_DIR, `${slug}${extension}`))) {
      return `/acervo/capas/${slug}${extension}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Blocos do seed
// ---------------------------------------------------------------------------

async function seedSettings(): Promise<void> {
  /**
   * Contatos institucionais NÃO são inventados: ficam em branco até que a
   * equipe do NEABI os preencha em /admin/configuracoes. A interface omite as
   * linhas vazias em vez de exibir um dado falso.
   */
  const base = {
    libraryName: "Biblioteca NEABI",
    institution: "CEFET/RJ",
    campus: "Campus Nova Iguaçu",
    serviceDays: [1, 2, 3, 4, 5],
    availableShifts: ["MORNING" as const, "AFTERNOON" as const],
    reservationLeadDays: 1,
    reservationHorizonDays: 60,
    pickupDeadlineDays: 3,
    maxActiveReservations: 3,
    reservationInstructions:
      "A reserva é para consulta e retirada presencial do exemplar no espaço do NEABI, conforme as normas do núcleo. Compareça no dia e turno confirmados, portando documento de identificação. O exemplar fica separado durante o prazo de retirada informado; após esse prazo, a reserva expira e a obra volta ao acervo.",
  };

  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", ...base },
    // Não sobrescreve contatos e horários já preenchidos pela equipe.
    update: {
      libraryName: base.libraryName,
      institution: base.institution,
      campus: base.campus,
    },
  });
}

async function seedUsers(): Promise<void> {
  const accounts = [
    {
      email: (process.env.SEED_ADMIN_EMAIL ?? "admin@neabi.local").toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? "Administração NEABI",
      password: process.env.SEED_ADMIN_PASSWORD ?? "neabi-admin-2026",
      role: "ADMIN" as const,
    },
    {
      email: "editor@neabi.local",
      name: "Equipe de catalogação",
      password: process.env.SEED_EDITOR_PASSWORD ?? "neabi-editor-2026",
      role: "EDITOR" as const,
    },
    {
      email: "usuario@neabi.local",
      name: "Pessoa usuária de exemplo",
      password: process.env.SEED_MEMBER_PASSWORD ?? "neabi-usuario-2026",
      role: "MEMBER" as const,
    },
  ];

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    await prisma.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
        emailVerified: new Date(),
      },
      // Senhas existentes não são sobrescritas em execuções posteriores.
      update: { name: account.name, role: account.role },
    });
  }
}

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const category of SEED_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        featured: category.featured,
      },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        featured: category.featured,
      },
      select: { id: true },
    });
    ids.set(category.slug, record.id);
  }
  return ids;
}

async function resolveInstitution(name: string): Promise<string> {
  const slug = slugify(name);
  const record = await prisma.institution.upsert({
    where: { slug },
    create: { name, slug },
    update: { name },
    select: { id: true },
  });
  return record.id;
}

async function seedBook(
  book: SeedBook,
  categoryIds: Map<string, string>,
): Promise<void> {
  const publisherId = book.publisher
    ? await resolveInstitution(book.publisher)
    : null;
  const institutionId = book.institution
    ? await resolveInstitution(book.institution)
    : null;

  const categoryNames = book.categories
    .map((slug) => SEED_CATEGORIES.find((c) => c.slug === slug)?.name)
    .filter((name): name is string => Boolean(name));

  const searchText = composeSearchText({
    title: book.title,
    subtitle: book.subtitle,
    collection: book.collection,
    publisher: book.publisher,
    institution: book.institution,
    edition: book.edition,
    materialType: materialTypeLabels[book.materialType],
    contributors: book.contributors.map((contributor) => contributor.name),
    categories: categoryNames,
    subjects: book.subjects,
  });

  const coverImage = findCoverFor(book.slug);

  const record = await prisma.book.upsert({
    where: { slug: book.slug },
    create: {
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle ?? null,
      publisherId,
      institutionId,
      collection: book.collection ?? null,
      edition: book.edition ?? null,
      notes: book.notes ?? null,
      materialType: book.materialType,
      catalogingStatus: book.catalogingStatus,
      // Ano, ISBN, páginas e idioma não foram conferidos: permanecem nulos.
      year: null,
      isbn: null,
      pages: null,
      language: null,
      coverImage,
      coverAlt: coverImage
        ? `Capa do exemplar de "${book.title}" no acervo do NEABI`
        : null,
      // Nenhum PDF autorizado foi cadastrado para o acervo inicial.
      digitalAvailable: false,
      status: "PUBLISHED",
      featured: book.featured ?? false,
      publishedAt: new Date(),
      searchText,
    },
    update: {
      title: book.title,
      subtitle: book.subtitle ?? null,
      publisherId,
      institutionId,
      collection: book.collection ?? null,
      edition: book.edition ?? null,
      notes: book.notes ?? null,
      materialType: book.materialType,
      featured: book.featured ?? false,
      searchText,
      // A capa é atualizada quando um arquivo passa a existir, mas nunca é
      // apagada: o admin pode ter enviado uma imagem melhor pelo painel.
      ...(coverImage ? { coverImage } : {}),
    },
    select: { id: true },
  });

  // Colaboradores — substituição completa preservando a ordem da ficha.
  await prisma.bookContributor.deleteMany({ where: { bookId: record.id } });
  let sortOrder = 0;
  for (const contributor of book.contributors) {
    const slug = slugify(contributor.name);
    const person = await prisma.person.upsert({
      where: { slug },
      create: { name: contributor.name, slug },
      update: {},
      select: { id: true },
    });
    await prisma.bookContributor.create({
      data: {
        bookId: record.id,
        personId: person.id,
        role: contributor.role,
        sortOrder,
      },
    });
    sortOrder += 1;
  }

  await prisma.bookCategory.deleteMany({ where: { bookId: record.id } });
  for (const slug of book.categories) {
    const categoryId = categoryIds.get(slug);
    if (!categoryId) {
      throw new Error(`Categoria "${slug}" não existe (obra: ${book.slug}).`);
    }
    await prisma.bookCategory.create({
      data: { bookId: record.id, categoryId },
    });
  }

  await prisma.bookSubject.deleteMany({ where: { bookId: record.id } });
  for (const name of book.subjects) {
    const slug = slugify(name);
    const subject = await prisma.subject.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
      select: { id: true },
    });
    await prisma.bookSubject.create({
      data: { bookId: record.id, subjectId: subject.id },
    });
  }

  /**
   * Um exemplar físico por obra: é o que foi efetivamente fotografado.
   * Número de tombo, prateleira e localização ficam nulos até o NEABI
   * informar — não são inventados aqui.
   */
  const code = `${book.slug.slice(0, 24).toUpperCase().replace(/-/g, "")}-001`;
  await prisma.physicalCopy.upsert({
    where: { code },
    create: {
      bookId: record.id,
      code,
      patrimonyCode: null,
      location: null,
      shelf: null,
      condition: null,
      status: "AVAILABLE",
    },
    update: {},
  });
}

/** Avisa quando há fotografias na pasta que não correspondem a nenhuma obra. */
function reportUnmatchedCovers(): void {
  if (!existsSync(COVERS_DIR)) return;
  const slugs = new Set(SEED_BOOKS.map((book) => book.slug));
  const orphans = readdirSync(COVERS_DIR)
    .filter((file) => COVER_EXTENSIONS.some((ext) => file.endsWith(ext)))
    .filter((file) => !slugs.has(file.replace(/\.[^.]+$/, "")));

  if (orphans.length > 0) {
    console.warn(
      `\n  Atenção: ${orphans.length} arquivo(s) em public/acervo/capas/ não correspondem ao slug de nenhuma obra:`,
    );
    for (const file of orphans) console.warn(`   - ${file}`);
    console.warn("  Renomeie-os para <slug-da-obra>.jpg ou vincule-os pelo painel.\n");
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.info("Semeando a Biblioteca NEABI…\n");

  await seedSettings();
  console.info("  ✓ configurações institucionais");

  await seedUsers();
  console.info("  ✓ contas de acesso");

  const categoryIds = await seedCategories();
  console.info(`  ✓ ${categoryIds.size} categorias`);

  let withCover = 0;
  for (const book of SEED_BOOKS) {
    await seedBook(book, categoryIds);
    if (findCoverFor(book.slug)) withCover += 1;
  }
  console.info(`  ✓ ${SEED_BOOKS.length} obras e ${SEED_BOOKS.length} exemplares físicos`);
  console.info(
    `  ✓ ${withCover} de ${SEED_BOOKS.length} obras com fotografia de capa vinculada`,
  );

  if (withCover < SEED_BOOKS.length) {
    console.info(
      `\n  ${SEED_BOOKS.length - withCover} obra(s) ainda sem capa. Coloque as fotografias em`,
    );
    console.info("  public/acervo/capas/<slug-da-obra>.jpg e rode `npm run db:seed` de novo.");
    console.info("  Consulte public/acervo/capas/README.md para a lista de slugs.");
  }

  reportUnmatchedCovers();
  console.info("\nConcluído.");
}

main()
  .catch((error) => {
    console.error("\nFalha no seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
