-- As fotografias do acervo passaram de PNG para WebP.
--
-- Fotografia em PNG é o formato errado para o conteúdo: as 19 capas somavam
-- 37,5 MB no repositório. A conversão mantém dimensão, enquadramento, cor e
-- perfil ICC — só a codificação muda — e leva o conjunto a 5,1 MB.
--
-- O caminho da capa está gravado em cada obra, então o banco existente precisa
-- acompanhar a troca de extensão; sem isto, as obras apontariam para arquivos
-- que não existem mais até alguém rodar o seed.
UPDATE "Book"
SET "coverImage" = regexp_replace("coverImage", '\.png$', '.webp')
WHERE "coverImage" LIKE '/acervo/capas/%.png';
