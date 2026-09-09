import { NextResponse } from "next/server";

import { AssetKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/server/storage";

/**
 * Entrega de arquivos do acervo.
 *
 * Os arquivos enviados pelo painel NÃO ficam em `/public`: são gravados fora da
 * raiz servida estaticamente e passam por aqui, onde a autorização é verificada
 * antes de qualquer byte sair. Assim, um PDF cadastrado mas ainda não liberado
 * é inacessível por URL direta — inclusive para quem descobrir a chave.
 *
 * Capas são públicas; documentos exigem `authorized`. O download só é oferecido
 * como anexo quando `downloadAllowed` está marcado.
 */

export const dynamic = "force-dynamic";

type Params = Promise<{ key: string[] }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { key: segments } = await params;
  const storageKey = segments.join("/");

  // A chave é sempre resolvida contra o banco: nada é lido do disco a partir de
  // um caminho fornecido pelo cliente.
  const asset = await prisma.digitalAsset.findUnique({
    where: { storageKey },
    select: {
      kind: true,
      mimeType: true,
      fileName: true,
      authorized: true,
      downloadAllowed: true,
      book: { select: { status: true } },
    },
  });

  if (!asset) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  const isCover = asset.kind === AssetKind.COVER;

  // Documento exige autorização explícita; obra despublicada não expõe arquivos.
  if (!isCover && !asset.authorized) {
    return new NextResponse("Arquivo não disponível para consulta.", {
      status: 403,
    });
  }
  if (asset.book.status !== "PUBLISHED" && !isCover) {
    return new NextResponse("Arquivo não disponível para consulta.", {
      status: 403,
    });
  }

  const body = await getStorage().read(storageKey);
  if (!body) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
  const asAttachment = wantsDownload && asset.downloadAllowed;

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": asAttachment
        ? `attachment; filename="${encodeURIComponent(asset.fileName)}"`
        : "inline",
      // Capas são imutáveis (a chave muda a cada upload). Documentos não são
      // cacheados por intermediários, porque a autorização pode ser revogada.
      "Cache-Control": isCover
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
