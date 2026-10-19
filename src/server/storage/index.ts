import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

import { env } from "@/server/env";
import { ValidationError } from "@/server/errors";

/**
 * Armazenamento de arquivos.
 *
 * Interface única para capas e PDFs. Três drivers a implementam:
 *
 *  - `local` — disco, para desenvolvimento;
 *  - `blob`  — Vercel Blob, para quem hospeda na Vercel;
 *  - `s3`    — qualquer serviço compatível com S3 (R2, Amazon S3, Supabase,
 *              MinIO), para quem hospeda em outro lugar.
 *
 * Nenhum serviço acima desta camada sabe qual driver está ativo. Todos
 * devolvem a mesma forma de chave, então trocar de armazenamento não invalida
 * os `DigitalAsset` já gravados — só exige mover os arquivos.
 */

export interface StoredFile {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  upload(input: {
    /** Pasta lógica, ex.: "capas" ou "documentos". */
    folder: string;
    file: File;
  }): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  /** Lê o conteúdo do arquivo. Usado pela rota que verifica autorização. */
  read(key: string): Promise<Buffer | null>;
  getUrl(key: string): string;
}

// ---------------------------------------------------------------------------
// Validação de arquivo
// ---------------------------------------------------------------------------

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_DOCUMENT_BYTES = 60 * 1024 * 1024; // 60 MB

/**
 * Teto imposto pela hospedagem, e não pelo produto.
 *
 * Funções da Vercel recusam requisições e respostas acima de 4,5 MB antes de o
 * código rodar. O upload passa por Server Action e a entrega pela rota
 * `/api/arquivos`, então os dois sentidos esbarram nele: sem este teto, uma
 * foto de 6 MB tirada no celular falharia com um erro genérico da plataforma.
 * Os 4 MB deixam folga para o envelope multipart e os demais campos.
 *
 * Arquivos maiores na Vercel exigem envio direto do navegador ao Blob e
 * entrega por streaming — ver README, "Armazenamento de arquivos".
 */
export const HOSTED_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024; // 4 MB

export interface UploadLimits {
  image: number;
  document: number;
}

/** Limites efetivos no ambiente atual — os mesmos no formulário e no servidor. */
export function uploadLimits(): UploadLimits {
  if (!process.env.VERCEL) {
    return { image: MAX_IMAGE_BYTES, document: MAX_DOCUMENT_BYTES };
  }
  return {
    image: Math.min(MAX_IMAGE_BYTES, HOSTED_UPLOAD_LIMIT_BYTES),
    document: Math.min(MAX_DOCUMENT_BYTES, HOSTED_UPLOAD_LIMIT_BYTES),
  };
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/**
 * Valida tipo e tamanho antes de qualquer escrita.
 *
 * O `type` declarado pelo navegador não é confiável sozinho, então também
 * conferimos a assinatura binária do arquivo (magic bytes). Um `.php`
 * renomeado para `.jpg` é rejeitado aqui.
 */
export async function assertValidUpload(
  file: File,
  options: { allowed: readonly string[]; maxBytes: number },
): Promise<void> {
  if (file.size === 0) {
    throw new ValidationError("O arquivo enviado está vazio.");
  }
  if (file.size > options.maxBytes) {
    const megabytes = Math.floor(options.maxBytes / (1024 * 1024));
    throw new ValidationError(
      `O arquivo excede o limite de ${megabytes} MB. Reduza o tamanho e envie de novo.`,
    );
  }
  if (!options.allowed.includes(file.type)) {
    throw new ValidationError("Formato de arquivo não permitido.");
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesSignature(signature, file.type)) {
    throw new ValidationError(
      "O conteúdo do arquivo não corresponde ao formato declarado.",
    );
  }
}

function matchesSignature(bytes: Uint8Array, mimeType: string): boolean {
  const startsWith = (...expected: number[]) =>
    expected.every((byte, index) => bytes[index] === byte);

  switch (mimeType) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "application/pdf":
      return startsWith(0x25, 0x50, 0x44, 0x46); // %PDF
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        startsWith(0x52, 0x49, 0x46, 0x46) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    case "image/avif":
      // Caixa "ftyp" na posição 4.
      return (
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70
      );
    default:
      return false;
  }
}

/**
 * Nome de arquivo seguro.
 *
 * O nome enviado nunca vira caminho: geramos um identificador aleatório e
 * mantemos a extensão derivada do tipo MIME já validado. Isso elimina de uma
 * vez travessia de diretório, colisão e caracteres problemáticos.
 */
export function buildStorageKey(folder: string, mimeType: string): string {
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "arquivos";
  const extension = EXTENSION_BY_MIME[mimeType] ?? "bin";
  return `${safeFolder}/${randomUUID()}.${extension}`;
}

/** Nome original higienizado, guardado apenas para exibição. */
export function sanitizeDisplayName(name: string): string {
  return (
    name
      .replace(/[\\/]/g, "-")
      .replace(/[^\w.\- ]/g, "")
      .trim()
      .slice(0, 120) || "arquivo"
  );
}

// ---------------------------------------------------------------------------
// Driver: sistema de arquivos local
// ---------------------------------------------------------------------------

/**
 * Confina um caminho dentro de uma raiz.
 *
 * `startsWith(root)` sozinho não basta: com raiz `/dados/uploads`, o caminho
 * `/dados/uploads-publico/x` passaria na comparação de prefixo e escaparia do
 * confinamento. Comparar contra `root + separador` (e aceitar a própria raiz)
 * fecha essa brecha.
 */
function dentroDaRaiz(caminhoResolvido: string, raiz: string): boolean {
  const raizNormalizada = resolve(raiz);
  return (
    caminhoResolvido === raizNormalizada ||
    caminhoResolvido.startsWith(raizNormalizada + sep)
  );
}

class LocalStorageProvider implements StorageProvider {
  private readonly root: string;
  private readonly publicBase: string;

  constructor() {
    // O diretório de uploads é configurável por ambiente e resolvido em
    // tempo de execução. O comentário impede que o empacotador tente rastrear
    // estaticamente o projeto inteiro a partir deste caminho dinâmico.
    const config = env();
    this.root = resolve(
      /* turbopackIgnore: true */
      process.cwd(),
      config.STORAGE_LOCAL_DIR,
    );
    this.publicBase = config.NEXT_PUBLIC_STORAGE_BASE_URL.replace(/\/+$/, "");
  }

  async upload({ folder, file }: { folder: string; file: File }) {
    const key = buildStorageKey(folder, file.type);
    const destination = join(this.root, key);

    // Defesa adicional: o destino resolvido precisa continuar dentro da raiz.
    if (!dentroDaRaiz(resolve(destination), this.root)) {
      throw new ValidationError("Caminho de arquivo inválido.");
    }

    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await file.arrayBuffer()));

    return {
      key,
      fileName: sanitizeDisplayName(file.name),
      mimeType: file.type,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    const destination = resolve(join(this.root, key));
    if (!dentroDaRaiz(destination, this.root)) return;
    await unlink(destination).catch(() => {
      /* já removido */
    });
  }

  async read(key: string): Promise<Buffer | null> {
    const source = resolve(join(this.root, key));
    // O caminho resolvido precisa permanecer dentro da raiz: bloqueia
    // travessia de diretório mesmo se a chave vier adulterada.
    if (!dentroDaRaiz(source, this.root)) return null;
    return readFile(source).catch(() => null);
  }

  getUrl(key: string): string {
    if (key.startsWith("/") || key.startsWith("http")) return key;
    return `${this.publicBase}/${key}`;
  }
}

// ---------------------------------------------------------------------------
// Driver: Vercel Blob
// ---------------------------------------------------------------------------

/**
 * Armazenamento no Vercel Blob.
 *
 * Existe porque o driver local não funciona em produção na Vercel: o sistema de
 * arquivos da função é somente-leitura, e um upload falharia ao criar o
 * diretório de destino.
 *
 * Duas decisões que valem explicação:
 *
 * **Tudo é gravado como privado.** Poderia ser tentador publicar as capas
 * direto no CDN do Blob — elas são públicas de qualquer forma. Mas isso criaria
 * dois caminhos de saída para os arquivos do acervo: um pela rota que confere
 * autorização e outro sem conferência nenhuma. Um PDF cadastrado por engano com
 * a visibilidade errada passaria a ser acessível por URL, que é exatamente a
 * garantia que este projeto não pode perder. Com tudo privado, `/api/arquivos`
 * continua sendo a única porta, e é ela que decide o que sai.
 *
 * O custo disso é uma invocação de função por arquivo — mitigado porque a rota
 * marca capa como `immutable` por um ano, então o CDN da Vercel serve as
 * repetições. Se o acervo crescer a ponto de isso pesar, o caminho é publicar
 * as capas (e só elas) no CDN, ajustando `images.remotePatterns` e a CSP.
 *
 * **A chave é o `pathname`.** O SDK aceita pathname em `get` e `del`, então a
 * mesma chave que o driver local usa serve aqui — `DigitalAsset.storageKey`
 * não muda de forma conforme o driver, e trocar de armazenamento não invalida
 * os registros já gravados.
 */
class VercelBlobStorageProvider implements StorageProvider {
  private readonly publicBase: string;

  constructor() {
    const config = env();
    if (!config.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        'STORAGE_DRIVER="blob" exige BLOB_READ_WRITE_TOKEN. ' +
          "Crie a store com: vercel blob create-store <nome> --access private",
      );
    }
    this.publicBase = config.NEXT_PUBLIC_STORAGE_BASE_URL.replace(/\/+$/, "");
  }

  async upload({ folder, file }: { folder: string; file: File }) {
    const { put } = await import("@vercel/blob");
    const key = buildStorageKey(folder, file.type);

    // `addRandomSuffix: false` é essencial: `buildStorageKey` já gera um UUID,
    // e um sufixo do serviço faria o pathname devolvido divergir da chave que
    // gravamos no banco — leitura e remoção passariam a não encontrar o arquivo.
    await put(key, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });

    return {
      key,
      fileName: sanitizeDisplayName(file.name),
      mimeType: file.type,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    // Remoção de arquivo já ausente não é erro: o efeito desejado é o mesmo.
    await del(key).catch(() => undefined);
  }

  async read(key: string): Promise<Buffer | null> {
    const { get } = await import("@vercel/blob");
    try {
      const result = await get(key, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch {
      return null;
    }
  }

  getUrl(key: string): string {
    if (key.startsWith("/") || key.startsWith("http")) return key;
    return `${this.publicBase}/${key}`;
  }
}

// ---------------------------------------------------------------------------
// Driver: S3 / R2 / Supabase Storage
// ---------------------------------------------------------------------------

class S3StorageProvider implements StorageProvider {
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor() {
    const config = env();
    // A ausência do bucket já é barrada pela validação de ambiente na subida do
    // servidor; esta checagem é o que dá ao TypeScript a garantia do valor.
    if (!config.S3_BUCKET) {
      throw new Error('STORAGE_DRIVER="s3" exige a variável S3_BUCKET.');
    }
    this.bucket = config.S3_BUCKET;
    this.publicBase = (
      config.S3_PUBLIC_BASE_URL ?? config.NEXT_PUBLIC_STORAGE_BASE_URL
    ).replace(/\/+$/, "");
  }

  /** Carregado sob demanda para não pesar o bundle no driver local. */
  private async client() {
    const { S3Client } = await import("@aws-sdk/client-s3").catch(() => {
      throw new Error(
        'STORAGE_DRIVER="s3" exige a dependência `@aws-sdk/client-s3`. Instale-a com: npm install @aws-sdk/client-s3',
      );
    });

    const config = env();
    return new S3Client({
      region: config.S3_REGION ?? "auto",
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: Boolean(config.S3_ENDPOINT),
      credentials:
        config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.S3_ACCESS_KEY_ID,
              secretAccessKey: config.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async upload({ folder, file }: { folder: string; file: File }) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const key = buildStorageKey(folder, file.type);

    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return {
      key,
      fileName: sanitizeDisplayName(file.name),
      mimeType: file.type,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async read(key: string): Promise<Buffer | null> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await result.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }

  getUrl(key: string): string {
    if (key.startsWith("/") || key.startsWith("http")) return key;
    return `${this.publicBase}/${key}`;
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;
  const driver = env().STORAGE_DRIVER;
  provider =
    driver === "s3"
      ? new S3StorageProvider()
      : driver === "blob"
        ? new VercelBlobStorageProvider()
        : new LocalStorageProvider();
  return provider;
}

/** Injeção para testes. */
export function setStorage(custom: StorageProvider | null): void {
  provider = custom;
}

/** Hash do conteúdo — usado para detectar reenvio do mesmo arquivo. */
export async function fileChecksum(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex").slice(0, 32);
}
