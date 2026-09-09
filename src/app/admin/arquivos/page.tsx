import Link from "next/link";

import { AdminPage, AdminTable, StatCard, Td, Th } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { AssetKind } from "@/generated/prisma/enums";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatDateTime } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/server/auth/session";

const KIND_LABELS: Record<AssetKind, string> = {
  COVER: "Capa",
  PDF: "Documento PDF",
  DOCUMENT: "Documento",
};

export default async function AdminAssetsPage() {
  await requireAnyPermission(["asset:upload", "asset:authorize"]);

  const [assets, covers, documents, authorized] = await Promise.all([
    prisma.digitalAsset.findMany({
      select: {
        id: true,
        kind: true,
        storageKey: true,
        fileName: true,
        size: true,
        authorized: true,
        downloadAllowed: true,
        createdAt: true,
        book: { select: { id: true, title: true, slug: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.digitalAsset.count({ where: { kind: AssetKind.COVER } }),
    prisma.digitalAsset.count({ where: { kind: AssetKind.PDF } }),
    prisma.digitalAsset.count({
      where: { kind: AssetKind.PDF, authorized: true },
    }),
  ]);

  const booksWithoutCover = await prisma.book.count({
    where: { coverImage: null },
  });

  return (
    <AdminPage
      title="Arquivos"
      description="Capas e documentos digitais do acervo. A liberação de consulta digital é feita na página de cada obra."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Capas enviadas" value={covers} />
        <StatCard
          label="Obras sem capa"
          value={booksWithoutCover}
          tone={booksWithoutCover > 0 ? "amber" : "neutral"}
          hint="Aparecem com cartão tipográfico"
          href="/admin/acervo"
        />
        <StatCard label="Documentos PDF" value={documents} />
        <StatCard
          label="Consulta digital liberada"
          value={authorized}
          tone={authorized > 0 ? "green" : "neutral"}
        />
      </div>

      <div className="mt-8">
        {assets.length === 0 ? (
          <EmptyState
            title="Nenhum arquivo enviado"
            description="Capas e documentos são enviados na página de cada obra, na seção Arquivos."
          />
        ) : (
          <AdminTable
            caption="Arquivos do acervo"
            head={
              <>
                <Th>Arquivo</Th>
                <Th>Obra</Th>
                <Th>Tipo</Th>
                <Th>Tamanho</Th>
                <Th>Situação</Th>
                <Th>Enviado</Th>
              </>
            }
          >
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-surface-muted">
                <Td className="max-w-64">
                  <a
                    href={resolveAssetUrl(asset.storageKey) ?? "#"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="truncate underline underline-offset-4"
                  >
                    {asset.fileName}
                  </a>
                </Td>
                <Td className="max-w-64">
                  <Link
                    href={`/admin/acervo/${asset.book.id}`}
                    className="line-clamp-2 text-ink-800 hover:text-neabi-red-700"
                  >
                    {asset.book.title}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-600">
                  {KIND_LABELS[asset.kind]}
                </Td>
                <Td className="whitespace-nowrap tabular-nums text-ink-600">
                  {formatBytes(asset.size)}
                </Td>
                <Td>
                  {asset.kind === AssetKind.PDF ? (
                    <Badge
                      variant={asset.authorized ? "green" : "neutral"}
                      size="sm"
                    >
                      {asset.authorized ? "Autorizado" : "Não autorizado"}
                    </Badge>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-[0.8125rem] text-ink-500">
                  {formatDateTime(asset.createdAt)}
                  {asset.uploadedBy?.name ? (
                    <span className="block text-[0.75rem]">
                      {asset.uploadedBy.name}
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>
    </AdminPage>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
