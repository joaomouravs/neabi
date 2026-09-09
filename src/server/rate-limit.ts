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

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

function enabled(): boolean {
  return process.env.RATE_LIMIT_ENABLED !== "false";
}

export function checkRateLimit({
  action,
  subject,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  if (!enabled()) return { allowed: true, retryAfterMs: 0 };

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

/**
 * Consulta o estado da janela sem consumir uma tentativa.
 *
 * Existe para que a mesma tentativa não seja contada duas vezes quando dois
 * pontos do caminho precisam saber do limite: o formulário consulta para dar
 * uma mensagem clara ("aguarde N segundos"), e o ponto de verificação real —
 * aquele que também é alcançável sem passar pelo formulário — é quem conta.
 */
export function peekRateLimit({
  action,
  subject,
  limit,
}: Omit<RateLimitOptions, "windowMs">): RateLimitResult {
  if (!enabled()) return { allowed: true, retryAfterMs: 0 };

  const now = Date.now();
  const window = hits.get(`${action}:${subject}`);
  if (!window || window.resetAt <= now) return { allowed: true, retryAfterMs: 0 };
  if (window.count >= limit) {
    return { allowed: false, retryAfterMs: window.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function enforceRateLimit(options: RateLimitOptions): void {
  assertAllowed(checkRateLimit(options));
}

/** Aplica o limite sem consumir tentativa — ver `peekRateLimit`. */
export function enforceRateLimitPeek(
  options: Omit<RateLimitOptions, "windowMs">,
): void {
  assertAllowed(peekRateLimit(options));
}

function assertAllowed(result: RateLimitResult): void {
  if (result.allowed) return;
  const seconds = Math.ceil(result.retryAfterMs / 1000);
  throw new RateLimitError(
    `Muitas tentativas. Aguarde ${seconds} segundo${seconds === 1 ? "" : "s"} e tente novamente.`,
  );
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
