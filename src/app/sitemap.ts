import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { listAllPublishedSlugs } from "@/server/repositories/book-repository";

/**
 * Sitemap.
 *
 * Inclui apenas o que é público: páginas institucionais, o acervo e cada obra
 * publicada. Áreas autenticadas ficam de fora, e o catálogo filtrado também —
 * o `robots.txt` o bloqueia, e anunciar no sitemap uma URL bloqueada só gera
 * aviso no Search Console.
 */
/** Obras novas entram no sitemap sem esperar um novo deploy. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await listAllPublishedSlugs();

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/acervo`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/contato`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteConfig.url}/acessibilidade`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const bookRoutes: MetadataRoute.Sitemap = books.map((book) => ({
    url: `${siteConfig.url}/acervo/${book.slug}`,
    lastModified: book.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...bookRoutes];
}
