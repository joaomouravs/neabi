/**
 * Reconhece agentes automatizados pelo `User-Agent`.
 *
 * Serve só para não contar robôs como leitores nas estatísticas do acervo —
 * nunca para controle de acesso, já que o cabeçalho é declarado pelo próprio
 * cliente. Cobre buscadores, rastreadores de IA, ferramentas de SEO, prévias
 * de link e clientes HTTP de linha de comando.
 */
const BOT_PATTERN =
  /bot\b|bot\/|crawl|spider|slurp|scrap|fetch|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|telegram|discord|slack|embedly|curl\/|wget\/|python-|httpx|aiohttp|go-http-client|okhttp|java\/|node-fetch|axios\/|undici|gptbot|chatgpt|claude|anthropic|perplexity|bytespider|ccbot|petalbot|semrush|ahrefs|mj12|dotbot|yandex|baidu|applebot|amazonbot/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true;
  return BOT_PATTERN.test(userAgent);
}
