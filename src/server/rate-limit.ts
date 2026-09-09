import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { RateLimitError } from "./errors";

/**
 * Limitação de taxa.
 *
 * Implementação em memória, por processo. É suficiente para uma instância — o
 * cenário desta biblioteca — e protege contra o abuso realista: envio repetido
 * de formulários e tentativas de adivinhação de senha.
 *
 * LIMITAÇÃO CONHECIDA: em múltiplas instâncias, cada processo tem seu próprio
 * contador. Ao escalar horizontalmente, troque `hits` por um armazenamento
 * compartilhado (Redis/Upstash) — a interface pública deste módulo não muda.
 */

interface Window {
  count: number;
  resetAt: number;
}

const hits = new Map<string, Window>();

/** Remove janelas vencidas para o mapa não crescer indefinidamente. */
function sweep(now: number): void {
  if (hits.size < 500) return;
  for (const [key, window] of hits) {
    if (window.resetAt <= now) hits.delete(key);
  }
}

export interface RateLimitOptions {
  /** Identificador da ação, ex.: "login" ou "reserva". */
  action: string;
  /** Chave do sujeito (usuário, IP…). Já deve vir anonimizada. */
  subject: string;
  limit: number;
  windowMs: number;
}

export function checkRateLimit({
  action,
  subject,
  limit,
  windowMs,
}: RateLimitOptions): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  sweep(now);

  const key = `${action}:${subject}`;
  const window = hits.get(key);

  if (!window || window.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  window.count += 1;
  if (window.count > limit) {
    return { allowed: false, retryAfterMs: window.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function enforceRateLimit(options: RateLimitOptions): void {
  const result = checkRateLimit(options);
  if (!result.allowed) {
    const seconds = Math.ceil(result.retryAfterMs / 1000);
    throw new RateLimitError(
      `Muitas tentativas. Aguarde ${seconds} segundo${seconds === 1 ? "" : "s"} e tente novamente.`,
    );
  }
}

/**
 * Identificador estável e anônimo do cliente.
 *
 * O IP é submetido a hash com o nome da ação: serve para limitar taxa, mas não
 * permite reconstruir o endereço nem correlacionar ações entre si.
 */
export async function clientFingerprint(scope: string): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headerList.get("x-real-ip");
  const source = forwarded || real || "local";
  return createHash("sha256").update(`${scope}:${source}`).digest("hex").slice(0, 24);
}

/** Só para testes: zera o estado entre casos. */
export function resetRateLimits(): void {
  hits.clear();
}
