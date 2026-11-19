import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Rastreadores que coletam páginas para treinar modelos de IA ou alimentar
 * ferramentas de SEO. Não trazem leitores ao acervo e cada acesso consome
 * créditos da hospedagem (requisição e transferência). Buscadores (Google,
 * Bing) e assistentes que abrem uma página a pedido de alguém continuam
 * liberados — esses levam pessoas até a Biblioteca.
 *
 * Só funciona com quem respeita o robots.txt; os demais exigem firewall.
 */
const COLETORES_SEM_RETORNO = [
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "Meta-ExternalAgent",
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "DataForSeoBot",
  "BLEXBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: COLETORES_SEM_RETORNO, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Áreas autenticadas e rotas de serviço.
          "/admin",
          "/minha-conta",
          "/login",
          "/api/",
          // O catálogo com filtros é uma armadilha para rastreadores: cada
          // filtro é um link que soma um parâmetro à URL atual, e as combinações
          // de categoria, assunto, autoria, tipo, ordem e página são quase
          // infinitas — todas renderizadas no servidor. As obras continuam
          // alcançáveis pelo sitemap e pelas fichas, que são estáticas.
          "/acervo?",
          // Formulário de reserva e leitor digital exigem conta.
          "/acervo/*/reservar",
          "/acervo/*/ler",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
