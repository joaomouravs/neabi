import { describe, expect, it } from "vitest";

import { escapeLike, normalizeText, slugify, tokenizeQuery } from "@/lib/text";
import { composeSearchText } from "@/server/services/search-text";
import {
  buildCatalogQuery,
  parseCatalogSearchParams,
} from "@/validators/search";

/**
 * Busca.
 *
 * O requisito central é que "etnico" encontre "étnico" — sem depender de
 * extensão do PostgreSQL. Isso se apoia inteiramente na normalização testada
 * aqui.
 */

describe("normalização de texto", () => {
  it("remove diacríticos", () => {
    expect(normalizeText("Étnico")).toBe("etnico");
    expect(normalizeText("Relações Étnico-Raciais")).toBe(
      "relacoes etnico-raciais",
    );
    expect(normalizeText("Espírito das Periferias")).toBe(
      "espirito das periferias",
    );
    expect(normalizeText("Nova Iguaçu")).toBe("nova iguacu");
    expect(normalizeText("MEMÓRIA E ANCESTRALIDADE")).toBe(
      "memoria e ancestralidade",
    );
  });

  it("colapsa espaços e apara as bordas", () => {
    expect(normalizeText("  educação    popular  ")).toBe("educacao popular");
  });

  it("normaliza aspas tipográficas", () => {
    expect(normalizeText("“Negra Soul”")).toBe("'negra soul'");
  });

  it("é idempotente", () => {
    const once = normalizeText("Educação Étnico-Racial");
    expect(normalizeText(once)).toBe(once);
  });
});

describe("slug", () => {
  it("gera endereços em ASCII", () => {
    expect(slugify("Espírito das Periferias")).toBe("espirito-das-periferias");
    expect(slugify("Cadernos PENESB 6")).toBe("cadernos-penesb-6");
    expect(slugify("A África Explicada aos Meus Filhos")).toBe(
      "a-africa-explicada-aos-meus-filhos",
    );
  });

  it("não deixa hifens sobrando nas pontas", () => {
    expect(slugify("  — Memória —  ")).toBe("memoria");
  });

  it("lida com entrada sem caracteres aproveitáveis", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("tokenização da consulta", () => {
  it("separa termos e normaliza cada um", () => {
    expect(tokenizeQuery("Relações Étnico")).toEqual(["relacoes", "etnico"]);
  });

  it("mantém expressões entre aspas como uma unidade", () => {
    expect(tokenizeQuery('"povos indígenas" educação')).toEqual([
      "povos indigenas",
      "educacao",
    ]);
  });

  it("limita a quantidade de termos", () => {
    const many = Array.from({ length: 20 }, (_, i) => `termo${i}`).join(" ");
    expect(tokenizeQuery(many)).toHaveLength(8);
  });

  it("devolve lista vazia para consulta em branco", () => {
    expect(tokenizeQuery("   ")).toEqual([]);
  });
});

describe("escape de curingas", () => {
  it("neutraliza % e _ para que sejam buscados literalmente", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
  });
});

describe("índice de busca da obra", () => {
  it("reúne todos os campos pesquisáveis já normalizados", () => {
    const text = composeSearchText({
      title: "Espírito das Periferias",
      subtitle: "Ancestralidades Indígenas e Africanas na Baixada Fluminense",
      contributors: ["Nielson Rosa Bezerra"],
      categories: ["Povos Indígenas", "Memória e Ancestralidade"],
      subjects: ["Baixada Fluminense"],
      publisher: null,
      year: null,
    });

    for (const term of [
      "espirito",
      "periferias",
      "ancestralidades",
      "indigenas",
      "nielson",
      "baixada",
      "memoria",
    ]) {
      expect(text).toContain(term);
    }
  });

  it("indexa o ISBN com e sem separadores", () => {
    const text = composeSearchText({
      title: "Obra",
      isbn: "978-85-7359-123-4",
    });
    expect(text).toContain("978-85-7359-123-4");
    expect(text).toContain("9788573591234");
  });

  it("ignora campos ausentes sem produzir ruído", () => {
    const text = composeSearchText({
      title: "Obra",
      subtitle: null,
      publisher: null,
      year: null,
      isbn: null,
    });
    expect(text).toBe("obra");
  });

  it("não repete termos", () => {
    const text = composeSearchText({
      title: "Educação",
      subtitle: "Educação",
      categories: ["Educação"],
    });
    expect(text.split(" ").filter((word) => word === "educacao")).toHaveLength(1);
  });
});

describe("parâmetros de busca da URL", () => {
  it("aplica padrões quando a URL está vazia", () => {
    const params = parseCatalogSearchParams({});
    expect(params.q).toBe("");
    expect(params.sort).toBe("recentes");
    expect(params.page).toBe(1);
  });

  it("lê filtros da URL", () => {
    const params = parseCatalogSearchParams({
      q: "relacoes raciais",
      category: "educacao",
      sort: "titulo-asc",
      page: "3",
    });
    expect(params.q).toBe("relacoes raciais");
    expect(params.category).toBe("educacao");
    expect(params.sort).toBe("titulo-asc");
    expect(params.page).toBe(3);
  });

  it("cai no padrão diante de valores inválidos, sem quebrar a página", () => {
    const params = parseCatalogSearchParams({
      sort: "ordenacao-inexistente",
      page: "não é número",
      type: "FORMATO_INVALIDO",
    });
    expect(params.sort).toBe("recentes");
    expect(params.page).toBe(1);
    expect(params.type).toBeUndefined();
  });

  it("usa o primeiro valor quando o parâmetro se repete", () => {
    const params = parseCatalogSearchParams({ q: ["primeiro", "segundo"] });
    expect(params.q).toBe("primeiro");
  });

  it("serializa de volta para uma query canônica", () => {
    expect(
      buildCatalogQuery({ q: "educacao", category: "historia", page: 1 }),
    ).toBe("?q=educacao&category=historia");

    // Valores padrão são omitidos da URL.
    expect(buildCatalogQuery({ sort: "recentes", page: 1 })).toBe("");
    expect(buildCatalogQuery({ page: 2 })).toBe("?page=2");
  });

  it("faz o ciclo completo URL → filtros → URL", () => {
    const original = { q: "etnico", category: "educacao", sort: "titulo-asc", page: "2" };
    const parsed = parseCatalogSearchParams(original);
    expect(buildCatalogQuery(parsed)).toBe(
      "?q=etnico&category=educacao&sort=titulo-asc&page=2",
    );
  });
});
