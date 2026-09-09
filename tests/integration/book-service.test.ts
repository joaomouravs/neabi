import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  AssetKind,
  BookStatus,
  CatalogingStatus,
  ContributorRole,
  CopyStatus,
  MaterialType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/server/errors";
import {
  createBook,
  deleteBook,
  generateCopyCode,
  generateUniqueSlug,
  setBookStatus,
  syncDigitalAvailability,
  updateBook,
} from "@/server/services/book-service";
import type { BookFormValues } from "@/validators/book";

/**
 * Serviço de catalogação contra o banco real.
 *
 * O que só aparece aqui: a transação que cria obra, autoridades bibliográficas
 * e vínculos de uma vez; a resolução de instituições por nome (que cria ou
 * reaproveita registros); a geração de endereço único; e a regra de que
 * disponibilidade digital nunca é declarada, sempre derivada.
 *
 * Requer o banco de desenvolvimento no ar (`npm run db:dev`).
 */

const PREFIX = "teste-livros";

function form(overrides: Partial<BookFormValues> = {}): BookFormValues {
  return {
    title: "Obra de teste",
    subtitle: null,
    slug: "",
    publisherName: null,
    institutionName: null,
    collection: null,
    year: null,
    edition: null,
    language: null,
    pages: null,
    isbn: null,
    materialType: MaterialType.BOOK,
    catalogingStatus: CatalogingStatus.NEEDS_REVIEW,
    description: null,
    summary: null,
    notes: null,
    coverAlt: null,
    status: BookStatus.DRAFT,
    featured: false,
    contributors: [],
    categoryIds: [],
    tagNames: [],
    subjectNames: [],
    ...overrides,
  } as BookFormValues;
}

let categoryId: string;
const criados: string[] = [];

async function cleanup(): Promise<void> {
  await prisma.reservation.deleteMany({
    where: { book: { slug: { startsWith: PREFIX } } },
  });
  await prisma.book.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.person.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.institution.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.subject.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.tag.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

beforeAll(async () => {
  await cleanup();
  const category = await prisma.category.create({
    data: { slug: `${PREFIX}-eixo`, name: "Eixo de teste" },
    select: { id: true },
  });
  categoryId = category.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function novaObra(overrides: Partial<BookFormValues> = {}) {
  const created = await createBook(
    form({ slug: `${PREFIX}-${criados.length}-${Date.now()}`, ...overrides }),
  );
  criados.push(created.id);
  return created;
}

describe("criação de obra", () => {
  it("grava a obra e indexa o texto de busca sem acentos", async () => {
    const { id } = await novaObra({
      title: "Educação e Relações Étnico-Raciais",
    });

    const book = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { title: true, searchText: true, catalogingStatus: true },
    });

    expect(book.title).toBe("Educação e Relações Étnico-Raciais");
    // "étnico" precisa ser encontrável digitando "etnico".
    expect(book.searchText).toContain("etnico");
    expect(book.catalogingStatus).toBe(CatalogingStatus.NEEDS_REVIEW);
  });

  it("mantém metadados desconhecidos como null — nunca inventa valor", async () => {
    const { id } = await novaObra({ title: "Obra sem ficha catalográfica" });

    const book = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { year: true, isbn: true, pages: true, edition: true, publisherId: true },
    });

    expect(book.year).toBeNull();
    expect(book.isbn).toBeNull();
    expect(book.pages).toBeNull();
    expect(book.edition).toBeNull();
    expect(book.publisherId).toBeNull();
  });

  it("resolve instituição por nome, reaproveitando o registro existente", async () => {
    const nome = `${PREFIX} Editora Compartilhada`;
    const primeira = await novaObra({ title: "Primeira", publisherName: nome });
    const segunda = await novaObra({ title: "Segunda", publisherName: nome });

    const [a, b] = await Promise.all([
      prisma.book.findUniqueOrThrow({
        where: { id: primeira.id },
        select: { publisherId: true },
      }),
      prisma.book.findUniqueOrThrow({
        where: { id: segunda.id },
        select: { publisherId: true },
      }),
    ]);

    expect(a.publisherId).not.toBeNull();
    expect(a.publisherId).toBe(b.publisherId);
  });

  it("registra autoria e organização como papéis distintos da mesma obra", async () => {
    const { id } = await novaObra({
      title: "Obra com autoria e organização",
      contributors: [
        { name: `${PREFIX} Autora Um`, role: ContributorRole.AUTHOR },
        { name: `${PREFIX} Organizador Dois`, role: ContributorRole.ORGANIZER },
      ],
    });

    const vinculos = await prisma.bookContributor.findMany({
      where: { bookId: id },
      select: { role: true, person: { select: { name: true } } },
      orderBy: { sortOrder: "asc" },
    });

    expect(vinculos).toHaveLength(2);
    expect(vinculos.map((v) => v.role)).toEqual([
      ContributorRole.AUTHOR,
      ContributorRole.ORGANIZER,
    ]);
  });

  it("vincula categorias", async () => {
    const { id } = await novaObra({
      title: "Obra categorizada",
      categoryIds: [categoryId],
    });

    const vinculos = await prisma.bookCategory.findMany({
      where: { bookId: id },
      select: { categoryId: true },
    });
    expect(vinculos.map((v) => v.categoryId)).toEqual([categoryId]);
  });

  it("recusa endereço já usado por outra obra", async () => {
    const slug = `${PREFIX}-endereco-repetido`;
    await createBook(form({ slug, title: "Primeira ocupante" }));

    await expect(
      createBook(form({ slug, title: "Segunda tentativa" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("endereço (slug)", () => {
  it("deriva do título quando não informado", async () => {
    const created = await createBook(
      form({ title: `${PREFIX} Memória e Ancestralidade`, slug: "" }),
    );
    criados.push(created.id);
    expect(created.slug).toMatch(/^teste-livros-memoria-e-ancestralidade/);
  });

  it("acrescenta sufixo em vez de colidir com um endereço existente", async () => {
    const titulo = `${PREFIX} Título Repetido`;
    const primeiro = await createBook(form({ title: titulo, slug: "" }));
    criados.push(primeiro.id);

    const segundoSlug = await generateUniqueSlug(titulo);
    expect(segundoSlug).not.toBe(primeiro.slug);
    expect(segundoSlug.startsWith(primeiro.slug)).toBe(true);
  });
});

describe("atualização", () => {
  it("substitui os vínculos em vez de acumulá-los", async () => {
    const { id } = await novaObra({
      title: "Obra que muda de mãos",
      contributors: [{ name: `${PREFIX} Autoria Antiga`, role: ContributorRole.AUTHOR }],
      categoryIds: [categoryId],
    });

    await updateBook(
      id,
      form({
        title: "Obra que muda de mãos",
        slug: (await prisma.book.findUniqueOrThrow({ where: { id }, select: { slug: true } })).slug,
        contributors: [{ name: `${PREFIX} Autoria Nova`, role: ContributorRole.AUTHOR }],
        categoryIds: [],
      }),
    );

    const [vinculos, categorias] = await Promise.all([
      prisma.bookContributor.findMany({
        where: { bookId: id },
        select: { person: { select: { name: true } } },
      }),
      prisma.bookCategory.count({ where: { bookId: id } }),
    ]);

    expect(vinculos).toHaveLength(1);
    expect(vinculos[0].person.name).toBe(`${PREFIX} Autoria Nova`);
    expect(categorias).toBe(0);
  });

  it("recusa obra inexistente", async () => {
    await expect(updateBook("obra-que-nao-existe", form())).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("publicação e arquivamento", () => {
  it("carimba a data na primeira publicação e a preserva depois", async () => {
    const { id } = await novaObra({ title: "Obra a publicar" });

    await setBookStatus(id, BookStatus.PUBLISHED);
    const publicada = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { status: true, publishedAt: true },
    });
    expect(publicada.status).toBe(BookStatus.PUBLISHED);
    expect(publicada.publishedAt).not.toBeNull();

    await setBookStatus(id, BookStatus.ARCHIVED);
    await setBookStatus(id, BookStatus.PUBLISHED);

    const republicada = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { publishedAt: true },
    });
    // A data original é o registro de quando a obra entrou no acervo público.
    expect(republicada.publishedAt?.getTime()).toBe(
      publicada.publishedAt?.getTime(),
    );
  });

  it("arquiva sem apagar", async () => {
    const { id } = await novaObra({ title: "Obra a arquivar" });
    await setBookStatus(id, BookStatus.ARCHIVED);

    const book = await prisma.book.findUnique({
      where: { id },
      select: { status: true },
    });
    expect(book?.status).toBe(BookStatus.ARCHIVED);
  });
});

describe("exclusão", () => {
  it("recusa apagar obra com reserva registrada — o histórico não pode sumir", async () => {
    const { id } = await novaObra({ title: "Obra com histórico" });

    const usuario = await prisma.user.create({
      data: { email: `${PREFIX}-solicitante@exemplo.test`, name: "Solicitante" },
      select: { id: true },
    });
    await prisma.reservation.create({
      data: {
        protocol: `${PREFIX.toUpperCase()}-${Date.now()}`,
        userId: usuario.id,
        bookId: id,
        fullName: "Solicitante",
        email: `${PREFIX}-solicitante@exemplo.test`,
        phone: "(21) 90000-0000",
        patronType: "VISITOR",
        requestedDate: new Date(),
        shift: "MORNING",
      },
    });

    await expect(deleteBook(id)).rejects.toBeInstanceOf(ConflictError);

    await prisma.reservation.deleteMany({ where: { bookId: id } });
    await prisma.user.delete({ where: { id: usuario.id } });
  });

  it("apaga obra sem reservas", async () => {
    const { id } = await novaObra({ title: "Obra descartável" });
    await deleteBook(id);
    expect(await prisma.book.findUnique({ where: { id } })).toBeNull();
  });
});

describe("disponibilidade digital", () => {
  it("permanece falsa com PDF cadastrado mas NÃO autorizado", async () => {
    const { id } = await novaObra({ title: "Obra com PDF pendente" });

    await prisma.digitalAsset.create({
      data: {
        bookId: id,
        kind: AssetKind.PDF,
        storageKey: `${PREFIX}/pendente-${Date.now()}.pdf`,
        fileName: "documento.pdf",
        mimeType: "application/pdf",
        size: 1024,
        authorized: false,
      },
    });

    await syncDigitalAvailability(id);

    const book = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { digitalAvailable: true },
    });
    expect(book.digitalAvailable).toBe(false);
  });

  it("torna-se verdadeira somente após a autorização explícita", async () => {
    const { id } = await novaObra({ title: "Obra com PDF liberado" });

    const asset = await prisma.digitalAsset.create({
      data: {
        bookId: id,
        kind: AssetKind.PDF,
        storageKey: `${PREFIX}/liberado-${Date.now()}.pdf`,
        fileName: "documento.pdf",
        mimeType: "application/pdf",
        size: 1024,
        authorized: false,
      },
      select: { id: true },
    });

    await prisma.digitalAsset.update({
      where: { id: asset.id },
      data: { authorized: true },
    });
    await syncDigitalAvailability(id);

    const book = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { digitalAvailable: true },
    });
    expect(book.digitalAvailable).toBe(true);
  });

  it("uma capa não torna a obra legível online", async () => {
    const { id } = await novaObra({ title: "Obra só com capa" });

    await prisma.digitalAsset.create({
      data: {
        bookId: id,
        kind: AssetKind.COVER,
        storageKey: `${PREFIX}/capa-${Date.now()}.jpg`,
        fileName: "capa.jpg",
        mimeType: "image/jpeg",
        size: 2048,
        authorized: true,
      },
    });

    await syncDigitalAvailability(id);

    const book = await prisma.book.findUniqueOrThrow({
      where: { id },
      select: { digitalAvailable: true },
    });
    expect(book.digitalAvailable).toBe(false);
  });
});

describe("código de exemplar", () => {
  it("numera sequencialmente dentro da obra", async () => {
    const { id, slug } = await novaObra({ title: "Obra com vários exemplares" });

    const primeiro = await generateCopyCode(slug);
    await prisma.physicalCopy.create({
      data: { bookId: id, code: primeiro, status: CopyStatus.AVAILABLE },
    });
    const segundo = await generateCopyCode(slug);

    expect(primeiro).not.toBe(segundo);
    expect(segundo.endsWith("002")).toBe(true);
  });
});
