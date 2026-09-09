/**
 * Resolução de URL pública de um arquivo do acervo.
 *
 * Roda no servidor e no navegador, então não pode depender de segredos nem do
 * módulo de storage. A regra é simples e explícita:
 *
 *  - chave absoluta (`/acervo/capas/x.jpg`) ou URL completa → usada como está;
 *  - chave relativa (`uploads/capas/x.jpg`) → resolvida pela base pública
 *    configurada, que aponta para o disco local em desenvolvimento e para o
 *    bucket (R2/S3/Supabase) em produção.
 *
 * As fotografias do acervo inicial ficam em `/public/acervo/capas` e são
 * referenciadas por caminho absoluto — servidas como estáticos, sem depender do
 * driver de storage configurado.
 */

const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? ""
).replace(/\/+$/, "");

export function resolveAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (trimmed.length === 0) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return PUBLIC_BASE.length > 0 ? `${PUBLIC_BASE}/${trimmed}` : `/${trimmed}`;
}
