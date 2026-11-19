import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
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
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
