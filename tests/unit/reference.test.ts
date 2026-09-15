import { describe, expect, it } from "vitest";

import { ContributorRole } from "@/generated/prisma/enums";
import { buildReference, formatAbntName } from "@/lib/reference";

/**
 * Referência bibliográfica.
 *
 * A regra central é a mesma do acervo: nada estimado. Dado ausente vira a
 * convenção da NBR 6023 para informação desconhecida, nunca um valor inventado.
 */

const author = (name: string) => ({ role: ContributorRole.AUTHOR, person: { name } });
const organizer = (name: string) => ({ role: ContributorRole.ORGANIZER, person: { name } });

const base = {
  title: "Espírito das Periferias",
  subtitle: null,
  edition: null,
  year: null,
  publisher: null,
  institution: null,
  contributors: [],
};

describe("nome no formato ABNT", () => {
  it("inverte sobrenome e prenomes", () => {
    expect(formatAbntName("Nielson Rosa Bezerra")).toBe("BEZERRA, Nielson Rosa");
  });

  it("mantém partículas junto aos prenomes", () => {
    expect(formatAbntName("Iolanda de Oliveira")).toBe("OLIVEIRA, Iolanda de");
  });

  it("trata sufixos de parentesco como parte do sobrenome", () => {
    expect(formatAbntName("João da Silva Filho")).toBe("SILVA FILHO, João da");
  });

  it("aceita nome único sem quebrar", () => {
    expect(formatAbntName("Coletivo")).toBe("COLETIVO");
  });
});

describe("referência completa", () => {
  it("usa as convenções de dado desconhecido em vez de estimar", () => {
    expect(buildReference({ ...base, contributors: [author("Nielson Rosa Bezerra")] })).toBe(
      "BEZERRA, Nielson Rosa. Espírito das Periferias. [S. l.]: [s. n.], [s. d.].",
    );
  });

  it("inclui subtítulo, edição, editora e ano quando catalogados", () => {
    expect(
      buildReference({
        ...base,
        title: "Políticas Públicas e Raça",
        subtitle: "Avanços e perspectivas",
        edition: "2. ed.",
        year: 2019,
        publisher: { name: "Editora Exemplo" },
        contributors: [author("Ana Silva")],
      }),
    ).toBe(
      "SILVA, Ana. Políticas Públicas e Raça: Avanços e perspectivas. 2. ed. [S. l.]: Editora Exemplo, 2019.",
    );
  });

  it("indica organização quando não há autoria", () => {
    expect(
      buildReference({ ...base, title: "Cadernos PENESB 3", contributors: [organizer("Iolanda de Oliveira")] }),
    ).toBe("OLIVEIRA, Iolanda de (org.). Cadernos PENESB 3. [S. l.]: [s. n.], [s. d.].");
  });

  it("abrevia com et al. acima de três autorias", () => {
    const reference = buildReference({
      ...base,
      contributors: [author("Ana Um"), author("Bia Dois"), author("Caio Três"), author("Duda Quatro")],
    });
    expect(reference.startsWith("UM, Ana et al. Espírito das Periferias.")).toBe(true);
  });

  it("começa pelo título quando nenhuma responsabilidade foi registrada", () => {
    expect(buildReference(base)).toBe("Espírito das Periferias. [S. l.]: [s. n.], [s. d.].");
  });
});
