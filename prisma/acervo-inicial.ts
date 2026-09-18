import type {
  CatalogingStatus,
  ContributorRole,
  MaterialType,
} from "../src/generated/prisma/enums";

/**
 * Acervo físico inicial do NEABI — CEFET/RJ, campus Nova Iguaçu.
 *
 * REGRA INEGOCIÁVEL DESTE ARQUIVO: nada aqui é inventado.
 *
 * Cada campo corresponde ao que está efetivamente visível nos exemplares
 * fotografados. Ano, ISBN, editora, número de páginas, edição, autoria,
 * número de tombo e localização que não puderam ser lidos permanecem
 * ausentes (`undefined` → `null` no banco) e a obra fica marcada como
 * NEEDS_REVIEW, para catalogação posterior pela equipe.
 *
 * Não preencha um campo aqui sem tê-lo lido no exemplar.
 */

export interface SeedContributor {
  name: string;
  role: ContributorRole;
}

export interface SeedBook {
  slug: string;
  title: string;
  subtitle?: string;
  /** Editora impressa no exemplar. */
  publisher?: string;
  /** Instituição responsável ou vinculada à publicação. */
  institution?: string;
  /** Coleção ou série impressa na capa. */
  collection?: string;
  edition?: string;
  /** Observações de catalogação — textos lidos na capa que não são metadados. */
  notes?: string;
  materialType: MaterialType;
  catalogingStatus: CatalogingStatus;
  contributors: SeedContributor[];
  /** Slugs das categorias canônicas de navegação. */
  categories: string[];
  /** Assuntos livres, tal como descritos na ficha do NEABI. */
  subjects: string[];
  featured?: boolean;
  /**
   * A obra permanece sem fotografia de capa por decisão do projeto.
   *
   * Sem esta marca, a ausência apareceria no relatório do seed como uma
   * pendência a resolver, e alguém acabaria "resolvendo-a" com a capa de outra
   * edição ou uma imagem gerada. Marcada, o seed a reporta como decisão —
   * e a obra aparece no site com a ficha do sistema.
   */
  coverIntentionallyAbsent?: boolean;
}

/** Categorias de navegação do acervo (as mesmas dos filtros rápidos). */
export const SEED_CATEGORIES: {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  featured: boolean;
}[] = [
  {
    slug: "cultura-afro-brasileira",
    name: "Cultura Afro-Brasileira",
    description:
      "Obras sobre práticas, saberes, religiosidades e expressões culturais afro-brasileiras.",
    sortOrder: 1,
    featured: true,
  },
  {
    slug: "povos-indigenas",
    name: "Povos Indígenas",
    description:
      "Obras sobre povos originários, territórios, línguas, direitos e modos de vida.",
    sortOrder: 2,
    featured: true,
  },
  {
    slug: "relacoes-etnico-raciais",
    name: "Relações Étnico-Raciais",
    description:
      "Estudos sobre racismo, desigualdade racial e relações étnico-raciais no Brasil.",
    sortOrder: 3,
    featured: true,
  },
  {
    slug: "educacao",
    name: "Educação",
    description:
      "Formação docente, currículo, práticas pedagógicas e políticas educacionais.",
    sortOrder: 4,
    featured: true,
  },
  {
    slug: "historia",
    name: "História",
    description:
      "História da África, da diáspora africana e das populações negras e indígenas no Brasil.",
    sortOrder: 5,
    featured: true,
  },
  {
    slug: "direitos-e-politicas",
    name: "Direitos e Políticas",
    description:
      "Políticas públicas, direitos humanos, ações afirmativas e promoção da igualdade racial.",
    sortOrder: 6,
    featured: true,
  },
  {
    slug: "genero-e-raca",
    name: "Gênero e Raça",
    description:
      "Interseções entre gênero, raça e desigualdade, com ênfase em mulheres negras e indígenas.",
    sortOrder: 7,
    featured: true,
  },
  {
    slug: "memoria-e-ancestralidade",
    name: "Memória e Ancestralidade",
    description:
      "Patrimônio, memória social, ancestralidade e territórios de referência afro-indígena.",
    sortOrder: 8,
    featured: true,
  },
  {
    slug: "pesquisa",
    name: "Pesquisa",
    description:
      "Metodologia, dados, indicadores e produção científica sobre relações raciais.",
    sortOrder: 9,
    featured: true,
  },
];

export const SEED_BOOKS: SeedBook[] = [
  {
    slug: "inventario-dos-terreiros-do-distrito-federal-e-entorno",
    title: "Inventário dos Terreiros do Distrito Federal e Entorno",
    institution: "IPHAN-DF",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [],
    categories: ["historia", "cultura-afro-brasileira", "memoria-e-ancestralidade"],
    subjects: ["Religiosidades de Matriz Africana", "Patrimônio e Memória"],
    featured: true,
  },
  {
    slug: "vozes-negras-no-servico-publico",
    title: "Vozes Negras no Serviço Público",
    subtitle: "Memórias e Narrativas Transatlânticas",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [],
    categories: [
      "relacoes-etnico-raciais",
      "memoria-e-ancestralidade",
      "cultura-afro-brasileira",
    ],
    subjects: ["Serviço Público", "Narrativas Transatlânticas"],
  },
  {
    slug: "etnopesquisa-critica-e-etnopesquisa-formacao",
    title: "Etnopesquisa Crítica e Etnopesquisa-Formação",
    collection: "Série Pesquisa 15",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Roberto Sidnei Macedo", role: "AUTHOR" }],
    categories: ["pesquisa", "educacao"],
    subjects: ["Metodologia"],
  },
  {
    slug: "historia-e-cultura-afro-brasileira",
    title: "História e Cultura Afro-Brasileira",
    publisher: "Editora Contexto",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Regiane Augusto de Mattos", role: "AUTHOR" }],
    categories: ["historia", "cultura-afro-brasileira"],
    subjects: [],
    featured: true,
  },
  {
    slug: "cinquenta-dias-a-bordo-de-um-navio-negreiro",
    title: "Cinquenta Dias a Bordo de um Navio Negreiro",
    publisher: "José Olympio",
    collection: "Baú de Histórias",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Pascoe Grenfell Hill", role: "AUTHOR" }],
    categories: ["historia", "memoria-e-ancestralidade"],
    subjects: ["Escravidão", "Diáspora Africana"],
  },
  {
    slug: "formacao-inicial-de-professores",
    title: "Formação Inicial de Professores",
    subtitle: "Conversas sobre relações raciais e educação",
    publisher: "Appris",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Janaina de Azevedo Corenza", role: "AUTHOR" }],
    categories: ["educacao", "relacoes-etnico-raciais"],
    subjects: ["Formação de Professores"],
  },
  {
    slug: "relacoes-etnico-raciais-e-educacao-no-brasil",
    title: "Relações Étnico-Raciais e Educação no Brasil",
    publisher: "Mazza Edições",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [
      { name: "Marcus Vinicius Fonseca", role: "ORGANIZER" },
      { name: "Carolina Mostaro Neves da Silva", role: "ORGANIZER" },
      { name: "Alexsandra Borges Fernandes", role: "ORGANIZER" },
    ],
    categories: ["educacao", "relacoes-etnico-raciais"],
    subjects: ["Políticas Educacionais"],
    featured: true,
  },
  {
    slug: "censo-etnico-racial-uff-ufmt",
    title:
      "Censo Étnico-Racial da Universidade Federal Fluminense e da Universidade Federal de Mato Grosso",
    subtitle: "Dados Preliminares",
    publisher: "EdUFF",
    materialType: "RESEARCH",
    catalogingStatus: "NEEDS_REVIEW",
    // A capa apresenta outros colaboradores além dos organizadores principais;
    // eles serão cadastrados quando a ficha completa for conferida.
    notes:
      "A capa apresenta colaboradores adicionais além dos organizadores registrados. Conferir a ficha catalográfica.",
    contributors: [
      { name: "André Augusto P. Brandão", role: "ORGANIZER" },
      { name: "Moema De Poli Teixeira", role: "ORGANIZER" },
    ],
    categories: ["pesquisa", "relacoes-etnico-raciais"],
    subjects: ["Ensino Superior", "Dados e Indicadores"],
  },
  {
    slug: "cadernos-penesb-1-relacoes-raciais-e-educacao",
    title: "Cadernos PENESB 1",
    subtitle: "Relações raciais e educação: alguns determinantes",
    materialType: "ACADEMIC_PUBLICATION",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [],
    categories: ["educacao", "relacoes-etnico-raciais", "pesquisa"],
    subjects: [],
  },
  {
    slug: "a-africa-explicada-aos-meus-filhos",
    title: "A África Explicada aos Meus Filhos",
    publisher: "Agir",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Alberto da Costa e Silva", role: "AUTHOR" }],
    categories: ["historia", "educacao"],
    subjects: ["África", "Cultura Africana"],
    featured: true,
  },
  {
    slug: "politicas-publicas-e-raca-avancos-e-perspectivas",
    title: "Políticas Públicas e Raça",
    subtitle: "Avanços e perspectivas",
    institution: "Universidade de Brasília",
    collection: "Gestão de Políticas Públicas em Gênero e Raça",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [
      { name: "Deborah Silva Santos", role: "AUTHOR" },
      { name: "Renísia Cristina Garcia-Filice", role: "AUTHOR" },
      { name: "Ruth Meyre Mota Rodrigues", role: "AUTHOR" },
    ],
    categories: ["direitos-e-politicas", "relacoes-etnico-raciais"],
    subjects: ["Políticas Públicas", "Direitos"],
  },
  {
    slug: "orientacoes-e-acoes-para-a-educacao-das-relacoes-etnico-raciais",
    title: "Orientações e Ações para a Educação das Relações Étnico-Raciais",
    materialType: "INSTITUTIONAL_PUBLICATION",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [],
    categories: ["educacao", "relacoes-etnico-raciais"],
    subjects: ["Políticas Educacionais"],
  },
  {
    slug: "negra-sou",
    title: "Negra Sou!",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [
      { name: "Renata Souza", role: "ORGANIZER" },
      { name: "Ana Maria Gonçalves", role: "CONTRIBUTOR" },
      { name: "Erika Hilton", role: "CONTRIBUTOR" },
      { name: "Talíria Petrone", role: "CONTRIBUTOR" },
      { name: "Dandara Suburbana", role: "CONTRIBUTOR" },
      { name: "Katiúscia Ribeiro", role: "CONTRIBUTOR" },
      { name: "Lúcia Xavier", role: "CONTRIBUTOR" },
      { name: "Marina Iris", role: "CONTRIBUTOR" },
      { name: "Sabrina Azevedo", role: "CONTRIBUTOR" },
    ],
    categories: [
      "cultura-afro-brasileira",
      "genero-e-raca",
      "direitos-e-politicas",
    ],
    subjects: ["Mulheres Negras", "Identidade", "Direitos"],
    featured: true,
  },
  {
    slug: "cadernos-penesb-3-a-producao-de-saberes-e-praticas-pedagogicas",
    title: "Cadernos PENESB 3",
    subtitle: "A produção de saberes e práticas pedagógicas",
    publisher: "EdUFF",
    materialType: "ACADEMIC_PUBLICATION",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Iolanda de Oliveira", role: "ORGANIZER" }],
    categories: ["educacao", "relacoes-etnico-raciais"],
    subjects: ["Práticas Pedagógicas"],
  },
  {
    slug: "cadernos-penesb-6",
    title: "Cadernos PENESB 6",
    subtitle: "Programa de Educação sobre o Negro na Sociedade Brasileira",
    publisher: "Quartet",
    institution: "EdUFF",
    materialType: "ACADEMIC_PUBLICATION",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Iolanda de Oliveira", role: "ORGANIZER" }],
    categories: ["educacao", "relacoes-etnico-raciais"],
    subjects: ["Sociedade Brasileira"],
  },
  {
    slug: "transversalidade-de-genero-e-raca-nas-politicas-publicas",
    title: "A Transversalidade de Gênero e Raça nas Políticas Públicas",
    subtitle: "Limites e possibilidades",
    institution: "Universidade de Brasília",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [
      { name: "Deborah Silva Santos", role: "AUTHOR" },
      { name: "Renísia Cristina Garcia-Filice", role: "AUTHOR" },
      { name: "Ruth Meyre Mota Rodrigues", role: "AUTHOR" },
    ],
    categories: ["genero-e-raca", "direitos-e-politicas"],
    subjects: ["Políticas Públicas", "Direitos"],
  },
  {
    slug: "desigualdades-raciais-construcoes-da-infancia-e-da-juventude",
    title: "Desigualdades Raciais",
    subtitle: "Construções da Infância e da Juventude",
    publisher: "Intertexto",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    // O nome impresso nesta obra é "Iolanda Oliveira"; em outras é "Iolanda de
    // Oliveira". Registramos como está no exemplar e deixamos a unificação de
    // autoridade para a conferência bibliográfica.
    notes:
      'Autoria impressa como "Iolanda Oliveira". Verificar se corresponde à mesma pessoa registrada como "Iolanda de Oliveira" em outras obras do acervo.',
    contributors: [{ name: "Iolanda Oliveira", role: "AUTHOR" }],
    categories: ["relacoes-etnico-raciais", "educacao"],
    subjects: ["Infância", "Juventude", "Desigualdade"],
    // Única obra do acervo inicial sem fotografia de capa, por decisão do
    // projeto. Não procurar imagem alternativa, não reaproveitar a capa de
    // outra obra, não gerar nada: ela aparece com a ficha do sistema.
    coverIntentionallyAbsent: true,
  },
  {
    slug: "espirito-das-periferias",
    title: "Espírito das Periferias",
    subtitle: "Ancestralidades Indígenas e Africanas na Baixada Fluminense",
    materialType: "BOOK",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Nielson Rosa Bezerra", role: "AUTHOR" }],
    categories: ["povos-indigenas", "memoria-e-ancestralidade", "historia"],
    subjects: [
      "Baixada Fluminense",
      "Ancestralidade",
      "Cultura Africana",
      "Território",
    ],
    featured: true,
  },
  {
    slug: "cartilha-gtpcegds",
    title: "Cartilha do GTPCEGDS",
    subtitle:
      "Contra todas as formas de assédio, em defesa dos direitos das mulheres, das/os indígenas, das/os negras/os, e das/os LGBT",
    institution: "ANDES — Sindicato Nacional",
    edition: "2ª edição",
    materialType: "BOOKLET",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [],
    categories: [
      "direitos-e-politicas",
      "povos-indigenas",
      "relacoes-etnico-raciais",
      "genero-e-raca",
    ],
    subjects: ["Direitos Humanos", "Diversidade", "Combate ao Assédio"],
  },
  {
    slug: "cadernos-penesb-4",
    title: "Cadernos PENESB 4",
    subtitle: "Relações raciais e educação: temas contemporâneos",
    publisher: "EdUFF",
    materialType: "ACADEMIC_PUBLICATION",
    catalogingStatus: "NEEDS_REVIEW",
    contributors: [{ name: "Iolanda de Oliveira", role: "ORGANIZER" }],
    categories: ["educacao", "relacoes-etnico-raciais"],
    subjects: ["Temas Contemporâneos"],
  },
  {
    slug: "plano-nacional-desenvolvimento-sustentavel-povos-comunidades-matriz-africana-2013-2015",
    title:
      "Plano Nacional de Desenvolvimento Sustentável dos Povos e Comunidades Tradicionais de Matriz Africana",
    subtitle: "2013–2015",
    institution: "Secretaria de Políticas de Promoção da Igualdade Racial",
    materialType: "PLAN",
    catalogingStatus: "NEEDS_REVIEW",
    notes:
      'Textos impressos na capa: "Em defesa da ancestralidade africana" e "Por um Brasil sem racismo". Publicação do Governo Federal.',
    contributors: [],
    categories: [
      "direitos-e-politicas",
      "memoria-e-ancestralidade",
      "cultura-afro-brasileira",
    ],
    subjects: [
      "Povos e Comunidades Tradicionais",
      "Matriz Africana",
      "Políticas Públicas",
      "Ancestralidade",
      "Direitos",
    ],
    featured: true,
  },
];
