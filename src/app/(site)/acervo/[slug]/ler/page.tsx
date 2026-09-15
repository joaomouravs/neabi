import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DigitalReader } from "@/components/books/digital-reader";
import { Breadcrumbs, Container, Eyebrow, NeabiRule } from "@/components/layout/primitives";
import { AssetKind } from "@/generated/prisma/enums";
import { resolveAssetUrl } from "@/lib/asset-url";
import { findBookBySlug } from "@/server/repositories/book-repository";

export const metadata: Metadata = {
  title: "Consulta digital",
  robots: { index: false, follow: false },
};

type Params = Promise<{ slug: string }>;

/**
 * Leitor digital.
 *
 * Só existe quando a obra tem um PDF **autorizado**. Sem isso, a rota devolve
 * 404 — não uma mensagem de "acesso negado", que já revelaria a existência do
 * arquivo. O acervo inicial do NEABI é físico e nenhuma obra chega aqui até
 * que o núcleo registre a autorização.
 */
export default async function ReaderPage({ params }: { params: Params }) {
  const { slug } = await params;
  const book = await findBookBySlug(slug);
  if (!book) notFound();

  const asset = book.assets.find(
    (item) => item.kind === AssetKind.PDF && item.authorized,
  );
  if (!asset) notFound();

  const source = resolveAssetUrl(asset.storageKey);
  if (!source) notFound();

  return (
    <>
      <div className="border-b border-border bg-surface-muted">
        <Container className="py-3.5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Início" },
              { href: "/acervo", label: "Acervo" },
              { href: `/acervo/${book.slug}`, label: book.title },
              { label: "Consulta digital" },
            ]}
          />
        </Container>
      </div>

      <Container className="pb-16 pt-8 sm:pt-10">
        <header className="max-w-3xl">
          <Eyebrow>Consulta digital</Eyebrow>
          <h1 className="mt-3 text-balance font-display text-display-sm font-bold text-ink-900">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="mt-2 text-pretty text-lede text-ink-600">{book.subtitle}</p>
          ) : null}
          <NeabiRule className="mt-5" />
        </header>

        <div className="mt-8">
          <DigitalReader
            source={source}
            fileName={asset.fileName}
            downloadAllowed={asset.downloadAllowed}
            title={book.title}
          />
        </div>

        <p className="mt-6 max-w-prose text-[0.8125rem] leading-relaxed text-ink-500">
          Material disponibilizado com autorização registrada pelo NEABI. A
          reprodução e a redistribuição seguem as condições da obra e do
          detentor dos direitos.
        </p>
      </Container>
    </>
  );
}
