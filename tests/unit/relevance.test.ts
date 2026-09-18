import { describe, expect, it } from "vitest";

import { rankByRelevance } from "@/lib/relevance";

/**
 * Ordem das sugestões da busca.
 *
 * A consulta ao banco já filtra o que casa com o termo em qualquer campo; a
 * relevância só decide a ordem — e o título precisa pesar mais que o eixo.
 */

const book = (title: string, subtitle: string | null = null, people: string[] = []) => ({
  title,
  subtitle,
  contributors: people.map((name) => ({ person: { name } })),
});

describe("relevância das sugestões", () => {
  it("coloca o termo no título antes do termo só no subtítulo", () => {
    const ranked = rankByRelevance(
      [
        book("Cadernos PENESB 1", "Relações raciais e educação"),
        book("Relações Étnico-Raciais e Educação no Brasil"),
      ],
      "relações",
    );
    expect(ranked[0].title).toBe("Relações Étnico-Raciais e Educação no Brasil");
  });

  it("ignora acentos ao comparar", () => {
    const ranked = rankByRelevance([book("Outra obra"), book("Relações Étnico-Raciais")], "relacoes etnico");
    expect(ranked[0].title).toBe("Relações Étnico-Raciais");
  });

  it("considera a autoria quando o título não tem o termo", () => {
    const ranked = rankByRelevance(
      [book("Negra Sou!"), book("A África Explicada aos Meus Filhos", null, ["Alberto da Costa e Silva"])],
      "costa silva",
    );
    expect(ranked[0].title).toBe("A África Explicada aos Meus Filhos");
  });

  it("preserva a ordem original entre obras de mesma relevância", () => {
    const input = [book("Primeira"), book("Segunda"), book("Terceira")];
    expect(rankByRelevance(input, "eixo").map((entry) => entry.title)).toEqual([
      "Primeira",
      "Segunda",
      "Terceira",
    ]);
  });
});
