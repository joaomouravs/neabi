-- Revisão bibliográfica de 24/11/2026: dados lidos nas capas fotografadas que
-- não tinham sido cadastrados (ver docs/revisao-bibliografica.md).
--
-- Só dados impressos no exemplar. Ano, ISBN, páginas e edição continuam
-- vazios: dependem da ficha catalográfica de cada exemplar, que a equipe
-- confere. Nenhuma obra muda de "a revisar" para "verificada" aqui.
--
-- Idempotente e restrita: cada UPDATE só age se o campo ainda estiver vazio
-- (ou com o valor antigo conhecido), para nunca sobrescrever uma edição feita
-- pela equipe no painel. Compatível com o código anterior: nenhum esquema muda.

-- 1. Editoras e instituições impressas nas capas.
INSERT INTO "Institution" ("id", "name", "slug", "updatedAt") VALUES
  ('rev20261124editorajandaira', 'Editora Jandaíra', 'editora-jandaira', CURRENT_TIMESTAMP),
  ('rev20261124liberlivro', 'Liber Livro', 'liber-livro', CURRENT_TIMESTAMP),
  ('rev20261124enap', 'Enap', 'enap', CURRENT_TIMESTAMP),
  ('rev20261124mir', 'Ministério da Igualdade Racial', 'ministerio-da-igualdade-racial', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- "Negra Sou!": Editora Jandaíra (capa e lombada).
UPDATE "Book"
SET "publisherId" = (SELECT "id" FROM "Institution" WHERE "slug" = 'editora-jandaira'),
    "searchText" = "searchText" || ' editora jandaira'
WHERE "slug" = 'negra-sou' AND "publisherId" IS NULL;

-- "Cadernos PENESB 1": Intertexto (capa e lombada).
UPDATE "Book"
SET "publisherId" = (SELECT "id" FROM "Institution" WHERE "slug" = 'intertexto'),
    "searchText" = "searchText" || ' intertexto'
WHERE "slug" = 'cadernos-penesb-1-relacoes-raciais-e-educacao' AND "publisherId" IS NULL;

-- "Etnopesquisa Crítica…": Liber Livro (capa).
UPDATE "Book"
SET "publisherId" = (SELECT "id" FROM "Institution" WHERE "slug" = 'liber-livro'),
    "searchText" = "searchText" || ' liber livro'
WHERE "slug" = 'etnopesquisa-critica-e-etnopesquisa-formacao' AND "publisherId" IS NULL;

-- "Vozes Negras no Serviço Público": Enap e Ministério da Igualdade Racial (capa).
UPDATE "Book"
SET "publisherId" = (SELECT "id" FROM "Institution" WHERE "slug" = 'enap'),
    "searchText" = "searchText" || ' enap'
WHERE "slug" = 'vozes-negras-no-servico-publico' AND "publisherId" IS NULL;

UPDATE "Book"
SET "institutionId" = (SELECT "id" FROM "Institution" WHERE "slug" = 'ministerio-da-igualdade-racial'),
    "searchText" = "searchText" || ' ministerio igualdade racial'
WHERE "slug" = 'vozes-negras-no-servico-publico' AND "institutionId" IS NULL;

-- 2. Coleções impressas nas capas.
UPDATE "Book"
SET "collection" = 'Gestão de Políticas Públicas em Gênero e Raça',
    "searchText" = "searchText" || ' gestao politicas publicas genero raca'
WHERE "slug" = 'transversalidade-de-genero-e-raca-nas-politicas-publicas'
  AND "collection" IS NULL;

UPDATE "Book"
SET "collection" = 'Pensar a Educação, Pensar o Brasil — Série Seminários',
    "searchText" = "searchText" || ' pensar educacao brasil serie seminarios'
WHERE "slug" = 'relacoes-etnico-raciais-e-educacao-no-brasil'
  AND "collection" IS NULL;

-- 3. Acento do nome impresso na capa e na lombada: "Janaína".
--    O slug e o texto de busca (sem acentos) não mudam.
UPDATE "Person"
SET "name" = 'Janaína de Azevedo Corenza', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'janaina-de-azevedo-corenza' AND "name" = 'Janaina de Azevedo Corenza';

-- 4. "Censo Étnico-Racial…": colaboradores impressos na capa, na ordem dela,
--    depois dos dois organizadores já cadastrados.
INSERT INTO "Person" ("id", "name", "slug", "updatedAt") VALUES
  ('rev20261124p01', 'Sérgio da Rocha Souza', 'sergio-da-rocha-souza', CURRENT_TIMESTAMP),
  ('rev20261124p02', 'Márcia Maria de J. Pessanha', 'marcia-maria-de-j-pessanha', CURRENT_TIMESTAMP),
  ('rev20261124p03', 'Maria Lúcia Muller', 'maria-lucia-muller', CURRENT_TIMESTAMP),
  ('rev20261124p04', 'Mária da Anunciação Silva', 'maria-da-anunciacao-silva', CURRENT_TIMESTAMP),
  ('rev20261124p05', 'Rosângela Saldanha Pereira', 'rosangela-saldanha-pereira', CURRENT_TIMESTAMP),
  ('rev20261124p06', 'Acildo Leite da Silva', 'acildo-leite-da-silva', CURRENT_TIMESTAMP),
  ('rev20261124p07', 'Maria Aparecida Aiza', 'maria-aparecida-aiza', CURRENT_TIMESTAMP),
  ('rev20261124p08', 'Teresa Josefa Cruz dos Santos', 'teresa-josefa-cruz-dos-santos', CURRENT_TIMESTAMP),
  ('rev20261124p09', 'Suely Dulce de Castilho', 'suely-dulce-de-castilho', CURRENT_TIMESTAMP),
  ('rev20261124p10', 'Victor Hugo Gouvea', 'victor-hugo-gouvea', CURRENT_TIMESTAMP),
  ('rev20261124p11', 'Victor Hugo Klagsbrun', 'victor-hugo-klagsbrun', CURRENT_TIMESTAMP),
  ('rev20261124p12', 'Denise Lopes Salles', 'denise-lopes-salles', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "BookContributor" ("id", "bookId", "personId", "role", "sortOrder")
SELECT 'rev20261124c' || lpad(c.ordem::text, 2, '0'), b."id", p."id", 'CONTRIBUTOR', c.ordem
FROM (VALUES
  ('iolanda-de-oliveira', 2),
  ('sergio-da-rocha-souza', 3),
  ('marcia-maria-de-j-pessanha', 4),
  ('maria-lucia-muller', 5),
  ('maria-da-anunciacao-silva', 6),
  ('rosangela-saldanha-pereira', 7),
  ('acildo-leite-da-silva', 8),
  ('maria-aparecida-aiza', 9),
  ('teresa-josefa-cruz-dos-santos', 10),
  ('suely-dulce-de-castilho', 11),
  ('victor-hugo-gouvea', 12),
  ('victor-hugo-klagsbrun', 13),
  ('denise-lopes-salles', 14)
) AS c(slug, ordem)
JOIN "Person" p ON p."slug" = c.slug
JOIN "Book" b ON b."slug" = 'censo-etnico-racial-uff-ufmt'
ON CONFLICT ("bookId", "personId", "role") DO NOTHING;

UPDATE "Book"
SET "notes" = 'Colaboradores cadastrados conforme a capa. Conferir na ficha catalográfica a grafia "Mária da Anunciação Silva", impressa com acento.',
    "searchText" = "searchText" || ' iolanda oliveira sergio rocha souza marcia maria j. pessanha maria lucia muller anunciacao silva rosangela saldanha pereira acildo leite aparecida aiza teresa josefa cruz santos suely dulce castilho victor hugo gouvea klagsbrun denise lopes salles'
WHERE "slug" = 'censo-etnico-racial-uff-ufmt'
  AND "notes" = 'A capa apresenta colaboradores adicionais além dos organizadores registrados. Conferir a ficha catalográfica.';
