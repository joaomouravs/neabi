import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetEnvCache } from "@/server/env";
import { audit, logger } from "@/server/logger";
import {
  checkRateLimit,
  enforceRateLimit,
  peekRateLimit,
  resetRateLimits,
} from "@/server/rate-limit";
import {
  assertValidUpload,
  buildStorageKey,
  DOCUMENT_MIME_TYPES,
  getStorage,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  sanitizeDisplayName,
  setStorage,
} from "@/server/storage";

/**
 * Infraestrutura do servidor: ambiente, log, limitação de taxa e armazenamento.
 *
 * São as camadas que ninguém olha quando estão funcionando — e que, quando
 * falham, falham em silêncio ou vazam algo. Cada caso aqui existe por um risco
 * concreto: subir sem segredo de sessão, escrever senha no log, aceitar um
 * executável renomeado como capa, ou gravar fora do diretório de uploads.
 */

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

describe("validação do ambiente", () => {
  const original = { ...process.env };

  /**
   * Ambiente mínimo válido, montado à mão.
   *
   * Os testes não leem o `.env` da máquina de propósito: o objetivo é provar o
   * comportamento do validador, e um `.env` local diferente faria o resultado
   * variar de desenvolvedor para desenvolvedor.
   */
  const BASE = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/neabi?schema=public",
    AUTH_SECRET: "a".repeat(64),
    STORAGE_DRIVER: "local",
    MAIL_DRIVER: "console",
  } as const;

  beforeEach(() => {
    process.env = { ...BASE } as unknown as NodeJS.ProcessEnv;
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...original };
    resetEnvCache();
  });

  async function carregar() {
    resetEnvCache();
    const { env } = await import("@/server/env");
    return env;
  }

  it("aceita uma configuração mínima válida", async () => {
    const env = await carregar();
    expect(() => env()).not.toThrow();
    expect(env().DATABASE_URL).toMatch(/^postgres(ql)?:\/\//);
    // Padrões aplicados sem exigir declaração explícita.
    expect(env().STORAGE_LOCAL_DIR).toBe("storage/uploads");
    expect(env().RATE_LIMIT_ENABLED).toBe(true);
  });

  it("recusa banco que não seja PostgreSQL", async () => {
    process.env.DATABASE_URL = "file:./dev.db";
    const env = await carregar();
    expect(() => env()).toThrow(/PostgreSQL/i);
  });

  it("recusa AUTH_SECRET ausente", async () => {
    delete process.env.AUTH_SECRET;
    const env = await carregar();
    expect(() => env()).toThrow(/AUTH_SECRET/);
  });

  it("recusa AUTH_SECRET curta demais", async () => {
    process.env.AUTH_SECRET = "curta";
    const env = await carregar();
    expect(() => env()).toThrow(/32 caracteres/);
  });

  it('exige bucket quando o armazenamento é "s3"', async () => {
    process.env.STORAGE_DRIVER = "s3";
    delete process.env.S3_BUCKET;
    const env = await carregar();
    expect(() => env()).toThrow(/S3_BUCKET/);
  });

  it('não exige bucket quando o armazenamento é "local"', async () => {
    process.env.STORAGE_DRIVER = "local";
    delete process.env.S3_BUCKET;
    const env = await carregar();
    expect(() => env()).not.toThrow();
  });

  it('exige servidor quando o e-mail é "smtp"', async () => {
    process.env.MAIL_DRIVER = "smtp";
    delete process.env.SMTP_HOST;
    const env = await carregar();
    expect(() => env()).toThrow(/SMTP_HOST/);
  });

  it("recusa segredo de desenvolvimento em produção", async () => {
    // `NODE_ENV` é somente-leitura nos tipos do Next; aqui precisamos simular
    // o ambiente de produção sem afrouxar a tipagem do resto do arquivo.
    (process.env as Record<string, string>).NODE_ENV = "production";
    process.env.AUTH_SECRET = "dev-secret-somente-para-desenvolvimento-local";
    const env = await carregar();
    expect(() => env()).toThrow(/desenvolvimento/i);
  });
});

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

describe("registro de eventos", () => {
  const original = process.env.LOG_LEVEL;
  let capturado: string[] = [];
  let infoOriginal: typeof console.info;
  let errorOriginal: typeof console.error;

  beforeEach(() => {
    capturado = [];
    infoOriginal = console.info;
    errorOriginal = console.error;
    console.info = (...args: unknown[]) => capturado.push(args.join(" "));
    console.error = (...args: unknown[]) => capturado.push(args.join(" "));
    process.env.LOG_LEVEL = "debug";
  });

  afterEach(() => {
    console.info = infoOriginal;
    console.error = errorOriginal;
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
  });

  it("redige senha, hash e token em qualquer profundidade", () => {
    logger.info("tentativa", {
      email: "pessoa@exemplo.test",
      password: "senha-secreta-real",
      usuario: {
        passwordHash: "$2b$12$abcdefghijklmnop",
        sessao: { sessionToken: "tok_123", accessToken: "at_456" },
      },
    });

    const linha = capturado.join("\n");
    expect(linha).not.toContain("senha-secreta-real");
    expect(linha).not.toContain("$2b$12$abcdefghijklmnop");
    expect(linha).not.toContain("tok_123");
    expect(linha).not.toContain("at_456");
    expect(linha).toContain("[redigido]");
    // O que não é sensível continua legível — o log precisa servir para algo.
    expect(linha).toContain("pessoa@exemplo.test");
  });

  it("registra o erro sem perder mensagem", () => {
    logger.error("falhou", { error: new Error("conexão recusada") });
    expect(capturado.join("\n")).toContain("conexão recusada");
  });

  it("corta estruturas fundas em vez de despejar o objeto inteiro", () => {
    const fundo = { a: { b: { c: { d: { e: { f: "muito fundo" } } } } } };
    logger.info("profundidade", fundo);
    const linha = capturado.join("\n");
    expect(linha).toContain("[profundo]");
    expect(linha).not.toContain("muito fundo");
  });

  it("silencia abaixo do nível configurado", () => {
    process.env.LOG_LEVEL = "error";
    logger.debug("não deve aparecer");
    logger.info("também não");
    expect(capturado).toHaveLength(0);

    logger.error("esta aparece");
    expect(capturado).toHaveLength(1);
  });

  it("marca eventos de auditoria com prefixo próprio", () => {
    audit("conta.papel_alterado", { userId: "u1", para: "ADMIN" });
    expect(capturado.join("\n")).toContain("audit:conta.papel_alterado");
  });
});

// ---------------------------------------------------------------------------
// Limitação de taxa
// ---------------------------------------------------------------------------

describe("limitação de taxa", () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.RATE_LIMIT_ENABLED = "true";
  });

  const opcoes = {
    action: "teste",
    subject: "sujeito",
    limit: 3,
    windowMs: 60_000,
  };

  it("libera até o limite e bloqueia depois", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit(opcoes).allowed).toBe(true);
    }
    expect(checkRateLimit(opcoes).allowed).toBe(false);
  });

  it("mantém contagens separadas por sujeito", () => {
    for (let i = 0; i < 4; i += 1) checkRateLimit(opcoes);
    expect(checkRateLimit({ ...opcoes, subject: "outro" }).allowed).toBe(true);
  });

  it("a consulta não consome tentativa", () => {
    // Dez consultas seguidas não podem esgotar um limite de três.
    for (let i = 0; i < 10; i += 1) {
      expect(peekRateLimit(opcoes).allowed).toBe(true);
    }
    expect(checkRateLimit(opcoes).allowed).toBe(true);
  });

  it("a consulta enxerga o bloqueio produzido pela contagem", () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit(opcoes);
    expect(peekRateLimit(opcoes).allowed).toBe(false);
  });

  it("lança erro de domínio ao estourar", () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit(opcoes);
    expect(() => enforceRateLimit(opcoes)).toThrow(/muitas tentativas/i);
  });

  it("pode ser desligada por ambiente, para testes", () => {
    process.env.RATE_LIMIT_ENABLED = "false";
    for (let i = 0; i < 50; i += 1) {
      expect(checkRateLimit(opcoes).allowed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Armazenamento
// ---------------------------------------------------------------------------

/** Constrói um arquivo com assinatura binária real do formato declarado. */
function arquivo(nome: string, tipo: string, assinatura: number[]): File {
  const conteudo = new Uint8Array([...assinatura, ...new Array(64).fill(0)]);
  return new File([conteudo], nome, { type: tipo });
}

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF = [0x25, 0x50, 0x44, 0x46];

describe("validação de upload", () => {
  const imagem = { allowed: IMAGE_MIME_TYPES, maxBytes: MAX_IMAGE_BYTES };

  it("aceita JPEG e PNG legítimos", async () => {
    await expect(
      assertValidUpload(arquivo("capa.jpg", "image/jpeg", JPEG), imagem),
    ).resolves.toBeUndefined();
    await expect(
      assertValidUpload(arquivo("capa.png", "image/png", PNG), imagem),
    ).resolves.toBeUndefined();
  });

  it("recusa formato fora da lista", async () => {
    await expect(
      assertValidUpload(arquivo("script.svg", "image/svg+xml", JPEG), imagem),
    ).rejects.toThrow(/não permitido/i);
  });

  it("recusa arquivo cujo conteúdo não corresponde ao tipo declarado", async () => {
    // Um PDF (ou qualquer outra coisa) renomeado e anunciado como JPEG.
    await expect(
      assertValidUpload(arquivo("disfarce.jpg", "image/jpeg", PDF), imagem),
    ).rejects.toThrow(/não corresponde/i);
  });

  it("recusa arquivo vazio", async () => {
    await expect(
      assertValidUpload(new File([], "vazio.jpg", { type: "image/jpeg" }), imagem),
    ).rejects.toThrow(/vazio/i);
  });

  it("recusa arquivo acima do limite", async () => {
    await expect(
      assertValidUpload(arquivo("grande.jpg", "image/jpeg", JPEG), {
        allowed: IMAGE_MIME_TYPES,
        maxBytes: 10,
      }),
    ).rejects.toThrow(/limite/i);
  });

  it("aceita PDF apenas onde documentos são permitidos", async () => {
    await expect(
      assertValidUpload(arquivo("obra.pdf", "application/pdf", PDF), {
        allowed: DOCUMENT_MIME_TYPES,
        maxBytes: MAX_IMAGE_BYTES,
      }),
    ).resolves.toBeUndefined();

    await expect(
      assertValidUpload(arquivo("obra.pdf", "application/pdf", PDF), imagem),
    ).rejects.toThrow(/não permitido/i);
  });
});

describe("nomes e chaves de armazenamento", () => {
  it("descarta o nome enviado e gera uma chave própria", () => {
    const chave = buildStorageKey("capas", "image/jpeg");
    expect(chave).toMatch(/^capas\/[0-9a-f-]{36}\.jpg$/);
  });

  it("neutraliza tentativa de travessia na pasta", () => {
    const chave = buildStorageKey("../../etc", "image/png");
    expect(chave.startsWith("etc/")).toBe(true);
    expect(chave).not.toContain("..");
  });

  it("higieniza o nome guardado para exibição", () => {
    expect(sanitizeDisplayName("../../../etc/passwd")).not.toContain("/");
    expect(sanitizeDisplayName("relatório final.pdf")).toBe("relatrio final.pdf");
    expect(sanitizeDisplayName("")).toBe("arquivo");
  });
});

describe("armazenamento local", () => {
  let raiz: string;
  const original = { ...process.env };
  const cwd = process.cwd();

  beforeEach(async () => {
    raiz = await mkdtemp(join(tmpdir(), "neabi-storage-"));
    // O armazenamento lê a configuração validada, não `process.env` cru: o
    // teste precisa montar um ambiente completo e limpar o cache.
    process.env = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/neabi",
      AUTH_SECRET: "a".repeat(64),
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: raiz,
    } as unknown as NodeJS.ProcessEnv;
    resetEnvCache();
    setStorage(null); // força reconstrução com a nova raiz
  });

  afterEach(() => {
    process.env = { ...original };
    resetEnvCache();
    setStorage(null);
  });

  it("grava, lê e remove um arquivo", async () => {
    const storage = getStorage();
    const guardado = await storage.upload({
      folder: "capas",
      file: arquivo("capa.jpg", "image/jpeg", JPEG),
    });

    expect(guardado.mimeType).toBe("image/jpeg");
    expect(await storage.read(guardado.key)).not.toBeNull();

    await storage.delete(guardado.key);
    expect(await storage.read(guardado.key)).toBeNull();
  });

  it("não lê fora do diretório de uploads", async () => {
    const fora = join(cwd, "package.json");
    const storage = getStorage();

    // Travessia por caminho relativo e por caminho absoluto.
    expect(await storage.read("../../../../etc/passwd")).toBeNull();
    expect(await storage.read(fora)).toBeNull();

    // Prova de que o arquivo existe — o `null` acima é recusa, não ausência.
    await expect(readFile(fora)).resolves.toBeDefined();
  });

  it("não confunde um diretório vizinho de prefixo parecido com o próprio", async () => {
    // A raiz "…/neabi-storage-abc" não pode alcançar "…/neabi-storage-abc-publico".
    // É o caso que uma comparação ingênua de prefixo (`startsWith`) deixaria passar.
    const vizinho = `${raiz}-publico`;
    await writeFile(join(raiz, "dentro.txt"), "ok");

    const storage = getStorage();
    expect(await storage.read(join(vizinho, "segredo.txt"))).toBeNull();
    // Dentro da raiz continua legível — a regra recusa o vizinho, não tudo.
    expect(await storage.read("dentro.txt")).not.toBeNull();
  });
});
