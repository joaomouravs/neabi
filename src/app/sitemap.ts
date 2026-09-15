import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { listAllPublishedSlugs } from "@/server/repositories/book-repository";
import { listCategoriesWithCounts } from "@/server/repositories/taxonomy-repository";

/**
 * Sitemap.
 *
 * Inclui apenas o que é público: páginas institucionais, o acervo, cada obra
 * publicada e as categorias com resultado. Áreas autenticadas ficam de fora.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, categories] = await Promise.all([
    listAllPublishedSlugs(),
    listCategoriesWithCounts(),
  ]);

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

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((category) => category.bookCount > 0)
    .map((category) => ({
      url: `${siteConfig.url}/acervo?category=${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...staticRoutes, ...bookRoutes, ...categoryRoutes];
}
