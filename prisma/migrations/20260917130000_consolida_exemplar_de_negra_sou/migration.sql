-- Consolida o exemplar físico de "Negra Sou!".
--
-- O código do exemplar do acervo inicial deriva do slug da obra
-- (`NEGRASOUL-001` vinha de `negra-soul`). Corrigido o slug, o seed passaria a
-- procurar `NEGRASOU-001`, não o encontraria e criaria um segundo exemplar —
-- a obra apareceria no site com dois volumes disponíveis, e só existe um na
-- estante. O seed deixou de criar exemplar para obra que já tem um; aqui o
-- banco existente é acertado.

-- Se o seed já criou o exemplar novo, o histórico é o que fica: ele pode ter
-- reservas, tombo e localização preenchidos pela equipe. O recém-criado só é
-- removido quando nada depende dele.
DELETE FROM "PhysicalCopy" nova
WHERE nova."code" = 'NEGRASOU-001'
  AND EXISTS (SELECT 1 FROM "PhysicalCopy" antiga WHERE antiga."code" = 'NEGRASOUL-001')
  AND NOT EXISTS (SELECT 1 FROM "Reservation" r WHERE r."copyId" = nova."id");

-- O exemplar histórico passa a usar o código derivado do slug corrigido.
UPDATE "PhysicalCopy"
SET "code" = 'NEGRASOU-001'
WHERE "code" = 'NEGRASOUL-001'
  AND NOT EXISTS (SELECT 1 FROM "PhysicalCopy" outra WHERE outra."code" = 'NEGRASOU-001');
