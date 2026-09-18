import type { NextConfig } from "next";

import { LEGACY_BOOK_SLUGS } from "./src/config/legacy-slugs";

/**
 * Cabeçalhos de segurança.
 *
 * A CSP é restritiva por padrão. `'unsafe-inline'` em `style-src` é necessário
 * porque o Next injeta estilos críticos inline; `'unsafe-eval'` fica restrito
 * ao ambiente de desenvolvimento, onde o Turbopack precisa dele para o
 * recarregamento rápido.
 */
const isDevelopment = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  // O leitor digital exibe o PDF em um iframe da própria origem.
  "frame-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Em desenvolvimento, o Next trata "localhost" e "127.0.0.1" como origens
  // distintas e bloqueia os recursos internos na segunda. Os testes de ponta a
  // ponta acessam por IP, então ambas precisam ser aceitas.
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  experimental: {
    // Uploads de capa e PDF passam por Server Actions.
    serverActions: { bodySizeLimit: "64mb" },
    // Habilita `forbidden()` e `unauthorized()`, usados no painel administrativo
    // para responder com o status HTTP correto em vez de uma página 200 que
    // apenas *parece* um erro de permissão.
    authInterrupts: true,
  },

  images: {
    // Formatos modernos com fallback automático.
    formats: ["image/avif", "image/webp"],
    // Fotografias de capa em proporção 3:4 — larguras suficientes para o grid.
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 128, 200, 260, 320, 384],
  },

  /**
   * Obras que mudaram de slug continuam respondendo no endereço antigo.
   *
   * O `:path*` leva junto as rotas filhas — /reservar, /ler — e o 308 preserva
   * o método e avisa buscadores de que a mudança é definitiva.
   */
  async redirects() {
    return Object.entries(LEGACY_BOOK_SLUGS).flatMap(([from, to]) => [
      {
        source: `/acervo/${from}`,
        destination: `/acervo/${to}`,
        permanent: true,
      },
      {
        source: `/acervo/${from}/:path*`,
        destination: `/acervo/${to}/:path*`,
        permanent: true,
      },
    ]);
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Fotografias do acervo são estáticas e imutáveis.
        source: "/acervo/capas/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
