-- Catalogação: título correto de "Negra Sou!", capas reais e ordem alfabética.
--
-- O banco de produção já está populado, então a correção não pode viver só no
-- seed: cada mudança abaixo atualiza os registros existentes.

-- 1. O título impresso na capa é "Negra Sou!", com exclamação. O registro havia
--    sido catalogado como "Negra Soul". O slug acompanha o título; a rota
--    antiga /acervo/negra-soul é redirecionada em next.config.ts.
UPDATE "Book"
SET "slug" = 'negra-sou',
    "title" = 'Negra Sou!',
    "searchText" = replace("searchText", 'negra soul', 'negra sou'),
    "coverImage" = CASE
      WHEN "coverImage" LIKE '%negra-soul.%'
        THEN replace("coverImage", 'negra-soul.', 'negra-sou.')
      ELSE "coverImage"
    END,
    "coverAlt" = CASE
      WHEN "coverAlt" IS NULL THEN NULL
      ELSE replace("coverAlt", 'Negra Soul', 'Negra Sou!')
    END
WHERE "slug" = 'negra-soul';

-- 2. Chave de ordenação alfabética.
--
-- Ordenar por "title" entrega o acervo fora de ordem quando a collation do
-- banco não é a do português: com a collation C, "Á" cai depois de "Z". A
-- coluna guarda o título já normalizado (ver `sortableTitle` em src/lib/text).
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "sortTitle" TEXT NOT NULL DEFAULT '';

-- Preenchimento inicial dos registros existentes. `translate` cobre os
-- diacríticos do português sem depender da extensão `unaccent`, que nem todo
-- provedor gerenciado disponibiliza. O seed e o serviço do acervo recalculam a
-- chave canônica (que também normaliza numerais de série) em cada escrita.
UPDATE "Book"
SET "sortTitle" = regexp_replace(
  lower(translate(
    "title",
    'ÁÀÂÃÄÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝáàâãäåçéèêëíìîïñóòôõöúùûüýÿ',
    'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy'
  )),
  '^[^a-z0-9]+', ''
);

CREATE INDEX IF NOT EXISTS "Book_sortTitle_idx" ON "Book"("sortTitle");
