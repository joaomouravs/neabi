import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookCard, formatCredit } from "@/components/books/book-card";
import { ContributorRole } from "@/generated/prisma/enums";
import type { BookCardRecord } from "@/server/repositories/book-repository";

/**
 * Cartão de obra.
 *
 * O que precisa se manter verdadeiro na interface pública: a disponibilidade
 * mostrada vem da contagem real de exemplares, os créditos indicam o papel
 * correto, e nada quebra com título longo ou metadados ausentes.
 */

function buildBook(overrides: Partial<BookCardRecord> = {}): BookCardRecord {
  return {
    id: "b1",
    slug: "espirito-das-periferias",
    title: "Espírito das Periferias",
    subtitle: "Ancestralidades Indígenas e Africanas na Baixada Fluminense",
    year: null,
    coverImage: null,
    coverAlt: null,
    materialType: "BOOK",
    digitalAvailable: false,
    status: "PUBLISHED",
    contributors: [
      {
        role: ContributorRole.AUTHOR,
        sortOrder: 0,
        person: { id: "p1", name: "Nielson Rosa Bezerra", slug: "nielson-rosa-bezerra" },
      },
    ],
    categories: [
      { category: { id: "c1", name: "Povos Indígenas", slug: "povos-indigenas" } },
    ],
    _count: { copies: 1 },
    ...overrides,
  } as BookCardRecord;
}

describe("BookCard", () => {
  it("apresenta título, subtítulo, categoria e autoria", () => {
    render(<BookCard book={buildBook()} />);

    expect(
      screen.getByRole("link", { name: "Espírito das Periferias" }),
    ).toHaveAttribute("href", "/acervo/espirito-das-periferias");
    expect(
      screen.getByText(/Ancestralidades Indígenas e Africanas/),
    ).toBeInTheDocument();
    expect(screen.getByText("Povos Indígenas")).toBeInTheDocument();
    expect(screen.getByText("Nielson Rosa Bezerra")).toBeInTheDocument();
  });

  it("mostra disponibilidade a partir da contagem de exemplares livres", () => {
    render(<BookCard book={buildBook({ _count: { copies: 2 } })} />);
    expect(screen.getByText("Exemplar disponível")).toBeInTheDocument();
  });

  it("indica exemplar em uso quando nenhum está livre", () => {
    render(<BookCard book={buildBook({ _count: { copies: 0 } })} />);
    expect(screen.getByText("Exemplar em uso")).toBeInTheDocument();
    expect(screen.queryByText("Exemplar disponível")).not.toBeInTheDocument();
  });

  it("não anuncia consulta digital sem arquivo autorizado", () => {
    render(<BookCard book={buildBook({ digitalAvailable: false })} />);
    expect(screen.queryByText("Consulta digital")).not.toBeInTheDocument();
  });

  it("anuncia consulta digital quando a obra tem material liberado", () => {
    render(<BookCard book={buildBook({ digitalAvailable: true })} />);
    expect(screen.getByText("Consulta digital")).toBeInTheDocument();
  });

  it("omite ano e subtítulo ausentes em vez de exibir placeholder", () => {
    render(<BookCard book={buildBook({ subtitle: null, year: null })} />);
    expect(screen.queryByText(/Ancestralidades/)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText(/não informado/i)).not.toBeInTheDocument();
  });

  it("mantém o título como único alvo acessível do cartão", () => {
    render(<BookCard book={buildBook()} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("sinaliza obras não publicadas para a equipe", () => {
    render(<BookCard book={buildBook({ status: "DRAFT" })} />);
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
  });

  it("aplica limite de linhas para títulos longos, sem quebrar o layout", () => {
    const longTitle =
      "Plano Nacional de Desenvolvimento Sustentável dos Povos e Comunidades Tradicionais de Matriz Africana";
    render(<BookCard book={buildBook({ title: longTitle })} />);
    expect(screen.getByRole("link", { name: longTitle })).toHaveClass(
      "line-clamp-3",
    );
  });
});

describe("créditos resumidos", () => {
  const person = (name: string) => ({ id: name, name, slug: name });

  it("não inventa crédito quando não há autoria registrada", () => {
    expect(formatCredit([])).toBeNull();
  });

  it("apresenta a autoria sem sufixo de papel", () => {
    expect(
      formatCredit([{ role: ContributorRole.AUTHOR, person: person("Ana Silva") }]),
    ).toBe("Ana Silva");
  });

  it("indica o papel quando não é autoria", () => {
    expect(
      formatCredit([
        { role: ContributorRole.ORGANIZER, person: person("Iolanda de Oliveira") },
      ]),
    ).toBe("Iolanda de Oliveira (organizador(a))");
  });

  it("prioriza autoria sobre organização", () => {
    expect(
      formatCredit([
        { role: ContributorRole.ORGANIZER, person: person("Organizadora") },
        { role: ContributorRole.AUTHOR, person: person("Autora") },
      ]),
    ).toBe("Autora");
  });

  it("resume listas longas em vez de estourar o cartão", () => {
    expect(
      formatCredit([
        { role: ContributorRole.AUTHOR, person: person("Um") },
        { role: ContributorRole.AUTHOR, person: person("Dois") },
        { role: ContributorRole.AUTHOR, person: person("Três") },
        { role: ContributorRole.AUTHOR, person: person("Quatro") },
      ]),
    ).toBe("Um; Dois e mais 2");
  });
});
