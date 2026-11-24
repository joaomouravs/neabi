import { NextResponse } from "next/server";

import { toISODate, todayInLibraryTimeZone } from "@/lib/date";
import { getActor } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/rate-limit";
import { exportAccountData } from "@/server/services/account-service";

/**
 * Cópia dos dados pessoais do titular, em JSON (LGPD, art. 18, II e V).
 *
 * Só responde a `GET` com sessão aberta e devolve apenas a conta da sessão.
 * Fica fora das páginas para que nenhum link pré-carregado dispare a consulta:
 * o download acontece só quando a pessoa clica.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Entre na sua conta para baixar os seus dados." },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    enforceRateLimit({
      action: "account-export",
      subject: actor.id,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const data = await exportAccountData(actor);
    const fileName = `meus-dados-biblioteca-neabi-${toISODate(todayInLibraryTimeZone())}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "RATE_LIMITED" ? 429 : error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status, headers: NO_STORE });
    }
    logger.error("Falha ao exportar os dados da conta", { error });
    return NextResponse.json(
      { error: "Não foi possível gerar o arquivo agora. Tente de novo em instantes." },
      { status: 500, headers: NO_STORE },
    );
  }
}
