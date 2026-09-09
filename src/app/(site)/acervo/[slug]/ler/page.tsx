import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container, NeabiRule } from "@/components/layout/primitives";
import { DigitalReader } from "@/components/books/digital-reader";
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
    <Container className="py-10 sm:py-12">
      <nav aria-label="Trilha de navegação" className="mb-6">
        <Link
          href={`/acervo/${book.slug}`}
          className="text-[0.875rem] text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          ← Voltar para a obra
        </Link>
      </nav>

      <header>
        <h1 className="text-balance font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-ink-900">
          {book.title}
        </h1>
        {book.subtitle ? (
          <p className="mt-2 text-[1.0625rem] text-ink-600">{book.subtitle}</p>
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
  );
}
