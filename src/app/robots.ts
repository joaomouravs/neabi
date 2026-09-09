import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas autenticadas e rotas de serviço não devem ser rastreadas.
      disallow: ["/admin", "/minha-conta", "/login", "/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
