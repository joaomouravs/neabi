-- Vincula as fotografias reais das capas às obras que ainda não têm capa.
--
-- As fotografias entraram em `public/acervo/capas/` em 17/09, mas quem as
-- vinculava era o seed — e o seed não pode rodar num banco com dados reais:
-- ele redefine as senhas das contas, as configurações e a autoria, categorias
-- e assuntos editados pela equipe. Em produção, as 21 obras seguiam com a
-- ficha "Sem fotografia de capa".
--
-- Só preenche onde `coverImage` está vazio: uma capa enviada ou trocada pela
-- equipe no painel nunca é sobrescrita, e o texto alternativo escrito por ela
-- também é preservado. "Desigualdades Raciais: Construções da Infância e da
-- Juventude" fica de fora por decisão do projeto (`coverIntentionallyAbsent`).
UPDATE "Book" AS b
SET "coverImage" = c."path",
    "coverAlt" = COALESCE(b."coverAlt", 'Capa do livro ' || b."title")
FROM (VALUES
  ('a-africa-explicada-aos-meus-filhos', '/acervo/capas/a-africa-explicada-aos-meus-filhos.webp'),
  ('cadernos-penesb-1-relacoes-raciais-e-educacao', '/acervo/capas/cadernos-penesb-1-relacoes-raciais-e-educacao.webp'),
  ('cadernos-penesb-3-a-producao-de-saberes-e-praticas-pedagogicas', '/acervo/capas/cadernos-penesb-3-a-producao-de-saberes-e-praticas-pedagogicas.webp'),
  ('cadernos-penesb-4', '/acervo/capas/cadernos-penesb-4.webp'),
  ('cadernos-penesb-6', '/acervo/capas/cadernos-penesb-6.webp'),
  ('cartilha-gtpcegds', '/acervo/capas/cartilha-gtpcegds.webp'),
  ('censo-etnico-racial-uff-ufmt', '/acervo/capas/censo-etnico-racial-uff-ufmt.webp'),
  ('cinquenta-dias-a-bordo-de-um-navio-negreiro', '/acervo/capas/cinquenta-dias-a-bordo-de-um-navio-negreiro.jpg'),
  ('espirito-das-periferias', '/acervo/capas/espirito-das-periferias.webp'),
  ('etnopesquisa-critica-e-etnopesquisa-formacao', '/acervo/capas/etnopesquisa-critica-e-etnopesquisa-formacao.webp'),
  ('formacao-inicial-de-professores', '/acervo/capas/formacao-inicial-de-professores.webp'),
  ('historia-e-cultura-afro-brasileira', '/acervo/capas/historia-e-cultura-afro-brasileira.webp'),
  ('inventario-dos-terreiros-do-distrito-federal-e-entorno', '/acervo/capas/inventario-dos-terreiros-do-distrito-federal-e-entorno.webp'),
  ('negra-sou', '/acervo/capas/negra-sou.webp'),
  ('orientacoes-e-acoes-para-a-educacao-das-relacoes-etnico-raciais', '/acervo/capas/orientacoes-e-acoes-para-a-educacao-das-relacoes-etnico-raciais.webp'),
  ('plano-nacional-desenvolvimento-sustentavel-povos-comunidades-matriz-africana-2013-2015', '/acervo/capas/plano-nacional-desenvolvimento-sustentavel-povos-comunidades-matriz-africana-2013-2015.webp'),
  ('politicas-publicas-e-raca-avancos-e-perspectivas', '/acervo/capas/politicas-publicas-e-raca-avancos-e-perspectivas.webp'),
  ('relacoes-etnico-raciais-e-educacao-no-brasil', '/acervo/capas/relacoes-etnico-raciais-e-educacao-no-brasil.webp'),
  ('transversalidade-de-genero-e-raca-nas-politicas-publicas', '/acervo/capas/transversalidade-de-genero-e-raca-nas-politicas-publicas.webp'),
  ('vozes-negras-no-servico-publico', '/acervo/capas/vozes-negras-no-servico-publico.webp')
) AS c("slug", "path")
WHERE b."slug" = c."slug"
  AND b."coverImage" IS NULL;
