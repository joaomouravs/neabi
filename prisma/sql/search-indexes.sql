-- Índices opcionais de busca — Biblioteca NEABI-NI
--
-- A busca do catálogo funciona sem estes índices: `Book.searchText` guarda o
-- texto já normalizado (minúsculas, sem acentos) e a consulta usa LIKE.
--
-- Em acervos grandes, um índice trigram torna esse LIKE com curinga à esquerda
-- muito mais rápido. Como a extensão `pg_trgm` não está disponível em todo
-- PostgreSQL gerenciado, ela fica fora da migração principal: aplique este
-- arquivo separadamente, quando o ambiente suportar.
--
--   psql "$DATABASE_URL" -f prisma/sql/search-indexes.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Book_searchText_trgm_idx"
  ON "Book" USING GIN ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Person_name_trgm_idx"
  ON "Person" USING GIN ("name" gin_trgm_ops);
