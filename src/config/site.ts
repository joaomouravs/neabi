/**
 * Constantes estáticas do produto.
 *
 * Dados institucionais que o NEABI pode alterar (e-mail, telefone, horários,
 * prazos de reserva) NÃO ficam aqui: vivem na entidade `Settings`, editável
 * pelo painel administrativo. Este arquivo guarda apenas o que é estrutural.
 */

export const siteConfig = {
  name: "Biblioteca NEABI",
  shortName: "NEABI",
  description:
    "Acervo de estudos afro-brasileiros e indígenas do NEABI — CEFET/RJ, campus Nova Iguaçu.",
  tagline: "Acervo de estudos afro-brasileiros e indígenas",
  locale: "pt-BR",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const mainNavigation = [
  { href: "/", label: "Início" },
  { href: "/acervo", label: "Acervo" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
] as const;

export const adminNavigation = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/acervo", label: "Acervo" },
  { href: "/admin/exemplares", label: "Exemplares" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/arquivos", label: "Arquivos" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/configuracoes", label: "Configurações" },
] as const;

export const accountNavigation = [
  { href: "/minha-conta", label: "Perfil", exact: true },
  { href: "/minha-conta/reservas", label: "Minhas reservas" },
  { href: "/minha-conta/historico", label: "Histórico" },
] as const;

/** Quantidade de obras por página no acervo público. */
export const CATALOG_PAGE_SIZE = 12;

/** Quantidade de linhas por página nas tabelas administrativas. */
export const ADMIN_PAGE_SIZE = 20;

/** Obras exibidas na seção "Acervo em destaque" da home. */
export const FEATURED_BOOKS_LIMIT = 8;
