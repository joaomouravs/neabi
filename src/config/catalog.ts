import {
  CatalogingStatus,
  ContributorRole,
  CopyCondition,
  CopyStatus,
  MaterialType,
  PatronType,
  ReservationStatus,
  Role,
  Shift,
} from "@/generated/prisma/enums";

/**
 * Rótulos em português para os enums do domínio.
 *
 * Centralizados aqui para que a mesma nomenclatura apareça no catálogo público,
 * na área do usuário e no painel administrativo — sem duplicação.
 */

export const materialTypeLabels: Record<MaterialType, string> = {
  BOOK: "Livro",
  BOOKLET: "Cartilha",
  REPORT: "Relatório",
  PLAN: "Plano",
  ACADEMIC_PUBLICATION: "Publicação acadêmica",
  INSTITUTIONAL_PUBLICATION: "Publicação institucional",
  RESEARCH: "Pesquisa",
  OTHER: "Outro",
};

export const contributorRoleLabels: Record<ContributorRole, string> = {
  AUTHOR: "Autoria",
  ORGANIZER: "Organização",
  EDITOR: "Edição",
  CONTRIBUTOR: "Colaboração",
  TRANSLATOR: "Tradução",
};

/** Forma singular usada em listas de créditos. */
export const contributorRoleShortLabels: Record<ContributorRole, string> = {
  AUTHOR: "Autor(a)",
  ORGANIZER: "Organizador(a)",
  EDITOR: "Editor(a)",
  CONTRIBUTOR: "Colaborador(a)",
  TRANSLATOR: "Tradutor(a)",
};

export const copyStatusLabels: Record<CopyStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  IN_USE: "Em consulta",
  UNAVAILABLE: "Indisponível",
  MAINTENANCE: "Em manutenção",
  LOST: "Extraviado",
};

export const copyConditionLabels: Record<CopyCondition, string> = {
  NEW: "Novo",
  GOOD: "Bom",
  FAIR: "Regular",
  POOR: "Frágil",
};

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  PENDING: "Aguardando análise",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  READY_FOR_PICKUP: "Pronta para retirada",
  PICKED_UP: "Em consulta",
  RETURNED: "Devolvida",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
};

/** Tom visual de cada status — mapeado para classes utilitárias no componente. */
export const reservationStatusTone: Record<
  ReservationStatus,
  "neutral" | "amber" | "green" | "red"
> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  READY_FOR_PICKUP: "green",
  PICKED_UP: "amber",
  RETURNED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "red",
};

export const shiftLabels: Record<Shift, string> = {
  MORNING: "Manhã",
  AFTERNOON: "Tarde",
  EVENING: "Noite",
};

export const patronTypeLabels: Record<PatronType, string> = {
  STUDENT: "Estudante",
  PROFESSOR: "Professor(a)",
  STAFF: "Técnico-administrativo",
  RESEARCHER: "Pesquisador(a)",
  VISITOR: "Visitante",
  EXTERNAL_COMMUNITY: "Comunidade externa",
  OTHER: "Outro",
};

/** Vínculos para os quais matrícula/identificação institucional é obrigatória. */
export const patronTypesRequiringRegistration: readonly PatronType[] = [
  PatronType.STUDENT,
  PatronType.PROFESSOR,
  PatronType.STAFF,
];

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administração",
  EDITOR: "Edição do acervo",
  MEMBER: "Usuário",
};

export const catalogingStatusLabels: Record<CatalogingStatus, string> = {
  NEEDS_REVIEW: "Dados bibliográficos incompletos",
  VERIFIED: "Conferido",
};

export const bookStatusLabels = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
} as const;

// ---------------------------------------------------------------------------
// Ordenação
// ---------------------------------------------------------------------------

export const SORT_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "titulo-asc", label: "Título A–Z" },
  { value: "titulo-desc", label: "Título Z–A" },
  { value: "ano-desc", label: "Ano mais recente" },
  { value: "ano-asc", label: "Ano mais antigo" },
  { value: "acessos", label: "Mais acessados" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortOption = "recentes";

// ---------------------------------------------------------------------------
// Filtros rápidos da página do acervo
// ---------------------------------------------------------------------------

/**
 * Categorias apresentadas como "pílulas" na parte superior do acervo.
 * Os slugs precisam existir na tabela `Category` (ver `prisma/seed.ts`).
 */
export const QUICK_FILTER_SLUGS = [
  "cultura-afro-brasileira",
  "povos-indigenas",
  "relacoes-etnico-raciais",
  "educacao",
  "historia",
  "direitos-e-politicas",
  "genero-e-raca",
  "memoria-e-ancestralidade",
  "pesquisa",
] as const;

export const AVAILABILITY_FILTERS = [
  { value: "fisico", label: "Exemplar físico disponível" },
  { value: "digital", label: "Consulta digital disponível" },
] as const;
