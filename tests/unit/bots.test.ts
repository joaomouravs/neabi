import { describe, expect, it } from "vitest";

import { isLikelyBot } from "@/lib/bots";

describe("isLikelyBot", () => {
  it("reconhece buscadores, rastreadores de IA e clientes de linha de comando", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
      "facebookexternalhit/1.1",
      "WhatsApp/2.23.20.0",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
    ]) {
      expect(isLikelyBot(ua), ua).toBe(true);
    }
  });

  it("trata ausência de User-Agent como automatizada", () => {
    expect(isLikelyBot(null)).toBe(true);
    expect(isLikelyBot("")).toBe(true);
  });

  it("aceita navegadores comuns", () => {
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0",
    ]) {
      expect(isLikelyBot(ua), ua).toBe(false);
    }
  });
});
