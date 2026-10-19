import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { logger } from "@/server/logger";
import { expireOverdueReservations } from "@/server/services/reservation-service";

/**
 * Expiração de reservas com prazo de retirada vencido.
 *
 * Pensada para ser chamada por um agendador. Sem ela, um exemplar reservado
 * por alguém que nunca apareceu ficaria indisponível para sempre — a regra de
 * prazo existiria no banco sem nada para aplicá-la.
 *
 * Em produção, quem chama é a Vercel Cron (`vercel.json`), que faz `GET` e
 * envia `Authorization: Bearer $CRON_SECRET` por conta própria. `POST` segue
 * aceito para agendadores externos e execução manual:
 *
 *   curl -X POST https://<host>/api/manutencao/expirar-reservas \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Sem `CRON_SECRET` configurado a rota responde 503, e não 200: uma rotina de
 * escrita sem autenticação é pior do que uma rotina que não roda.
 */

export const dynamic = "force-dynamic";

/** Comparação em tempo constante — evita distinguir segredos pelo tempo de resposta. */
function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function executar(request: Request): Promise<NextResponse> {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) {
    logger.warn("Rota de manutenção chamada sem CRON_SECRET configurado");
    return NextResponse.json(
      { erro: "Rotina de manutenção não configurada." },
      { status: 503 },
    );
  }

  const cabecalho = request.headers.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";

  if (!token || !segredoConfere(token, esperado)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const expiradas = await expireOverdueReservations();
    logger.info("Manutenção: reservas expiradas", { expiradas });
    return NextResponse.json({ expiradas });
  } catch (error) {
    logger.error("Manutenção: falha ao expirar reservas", { error });
    return NextResponse.json(
      { erro: "Não foi possível concluir a rotina." },
      { status: 500 },
    );
  }
}

export { executar as GET, executar as POST };
