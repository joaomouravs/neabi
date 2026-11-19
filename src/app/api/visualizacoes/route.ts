import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isLikelyBot } from "@/lib/bots";
import { getActor } from "@/server/auth/session";
import { checkRateLimit } from "@/server/rate-limit";
import { findBookBySlug } from "@/server/repositories/book-repository";
import { recordBookView } from "@/server/services/book-service";

/**
 * Registro de leitura da ficha de uma obra.
 *
 * Antes, a própria página contava a visualização ao ser renderizada. Com isso,
 * todo *prefetch* de um cartão que aparecia na tela virava uma "visualização",
 * e qualquer robô também — inflando "Mais acessados" e o painel de
 * estatísticas. Agora quem conta é o navegador, depois que a ficha abre de
 * fato; robôs declarados são ignorados, e recarregar a mesma ficha em seguida
 * não soma de novo.
 *
 * Responde sempre 204: a contagem é acessória e nunca deve virar um erro na
 * tela de quem está lendo.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({ slug: z.string().trim().min(1).max(200) });

/** Uma leitura por pessoa, por obra, a cada 30 minutos. */
const VIEW_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  const headerList = await headers();
  const userAgent = headerList.get("user-agent");
  if (isLikelyBot(userAgent)) return noContent;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noContent;

  const [book, actor] = await Promise.all([
    findBookBySlug(parsed.data.slug),
    getActor(),
  ]);
  if (!book) return noContent;

  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const seed = actor?.id ?? [forwarded, userAgent].filter(Boolean).join("|");

  const allowed = checkRateLimit({
    action: "visualizacao",
    subject: `${seed}:${book.id}`,
    limit: 1,
    windowMs: VIEW_WINDOW_MS,
  }).allowed;
  if (!allowed) return noContent;

  await recordBookView(book.id, {
    userId: actor?.id ?? null,
    visitorSeed: seed || null,
  });
  return noContent;
}
