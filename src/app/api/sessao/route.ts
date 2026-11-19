import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/permissions/rbac";

/**
 * Estado da sessão para a casca do site público.
 *
 * As páginas públicas são estáticas (servidas pelo CDN) e, por isso, não podem
 * ler o cookie de sessão ao serem renderizadas: uma leitura de cookie torna a
 * rota dinâmica, e cada visita — e cada *prefetch* de link — vira uma
 * renderização completa no servidor. Foi esse custo, multiplicado pelos
 * prefetches, que esgotou a cota de CPU da hospedagem em novembro de 2026.
 *
 * O cabeçalho pergunta aqui, uma vez por carregamento de página, quem está
 * conectado. A resposta só tem o necessário para o menu da conta e nunca é
 * guardada em cache compartilhado.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();

  const body = user?.id
    ? {
        user: {
          name: user.name ?? null,
          email: user.email ?? "",
          isStaff: canAccessAdmin({ id: user.id, role: user.role }),
        },
      }
    : { user: null };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
