import { NextResponse } from "next/server";

import { resolveAssetUrl } from "@/lib/asset-url";
import { formatCredit } from "@/lib/credits";
import { normalizeText, tokenizeQuery } from "@/lib/text";
import { logger } from "@/server/logger";
import { clientFingerprint, checkRateLimit } from "@/server/rate-limit";
import { findSearchSuggestions } from "@/server/repositories/book-repository";
import { listCategoriesWithCounts } from "@/server/repositories/taxonomy-repository";

/**
 * Sugestões da busca enquanto a pessoa digita.
 *
 * Responde com obras, eixos e pessoas que casam com o termo — tudo vindo do
 * banco, com a mesma semântica de `/acervo?q=…`. É leitura pública do catálogo
 * publicado: nenhum rascunho, nenhum dado de conta.
 */

export const dynamic = "force-dynamic";

const MIN_LENGTH = 2;
const MAX_LENGTH = 160;

export interface SearchSuggestionBook {
  slug: string;
  title: string;
  subtitle: string | null;
  credit: string | null;
  category: string | null;
  categorySlug: string | null;
  cover: string | null;
  coverAlt: string | null;
  available: boolean;
}

export interface SearchSuggestionsResponse {
  query: string;
  total: number;
  books: SearchSuggestionBook[];
  categories: { slug: string; name: string; bookCount: number }[];
  authors: { slug: string; name: string }[];
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const query = raw.trim().slice(0, MAX_LENGTH);

  const empty: SearchSuggestionsResponse = {
    query,
    total: 0,
    books: [],
    categories: [],
    authors: [],
  };

  if (query.length < MIN_LENGTH) return NextResponse.json(empty);

  // Cada tecla vira uma requisição: o limite é folgado para quem digita, e
  // ainda assim barra varredura automatizada do catálogo.
  const limit = checkRateLimit({
    action: "busca:sugestoes",
    subject: await clientFingerprint("sugestoes"),
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(empty, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  try {
    const tokens = tokenizeQuery(query);
    const [{ items, total }, categories] = await Promise.all([
      findSearchSuggestions(query, 6),
      listCategoriesWithCounts(),
    ]);

    const matches = (value: string) => {
      const normalized = normalizeText(value);
      return tokens.every((token) => normalized.includes(token));
    };

    const authors = new Map<string, { slug: string; name: string }>();
    for (const book of items) {
      for (const contributor of book.contributors) {
        if (authors.size >= 3) break;
        if (matches(contributor.person.name)) {
          authors.set(contributor.person.slug, {
            slug: contributor.person.slug,
            name: contributor.person.name,
          });
        }
      }
    }

    const body: SearchSuggestionsResponse = {
      query,
      total,
      books: items.map((book) => ({
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        credit: formatCredit(book.contributors),
        category: book.categories[0]?.category.name ?? null,
        categorySlug: book.categories[0]?.category.slug ?? null,
        cover: resolveAssetUrl(book.coverImage),
        coverAlt: book.coverAlt,
        available: book._count.copies > 0,
      })),
      categories: categories
        .filter((category) => category.bookCount > 0 && matches(category.name))
        .slice(0, 3)
        .map(({ slug, name, bookCount }) => ({ slug, name, bookCount })),
      authors: [...authors.values()],
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60" },
    });
  } catch (error) {
    // Sugestão é conveniência: falhar aqui nunca impede a busca completa.
    logger.warn("Falha ao montar sugestões de busca", { error });
    return NextResponse.json(empty, { status: 503 });
  }
}
