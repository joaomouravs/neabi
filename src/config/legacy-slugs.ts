/**
 * Slugs de obras que mudaram de endereço.
 *
 * Um slug publicado é um endereço permanente: pode estar num trabalho citado,
 * num e-mail do núcleo, num favorito de quem pesquisa. Quando a catalogação
 * corrige o título, o endereço antigo continua valendo — como redirecionamento
 * permanente (308) para o novo, declarado em `next.config.ts`.
 *
 * A tabela é lida na configuração do Next, então este arquivo não pode importar
 * nada do resto do projeto.
 */
export const LEGACY_BOOK_SLUGS: Readonly<Record<string, string>> = {
  // O título impresso na capa é "Negra Sou!", com exclamação; o registro havia
  // entrado no acervo como "Negra Soul".
  "negra-soul": "negra-sou",
};
