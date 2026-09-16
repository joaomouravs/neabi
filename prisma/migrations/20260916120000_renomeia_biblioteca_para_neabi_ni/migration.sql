-- A plataforma passou a se chamar "Biblioteca NEABI-NI", explicitando o campus
-- Nova Iguaçu. O núcleo continua sendo o NEABI: só o nome da biblioteca muda.
ALTER TABLE "Settings" ALTER COLUMN "libraryName" SET DEFAULT 'Biblioteca NEABI-NI';

-- Instalações que nunca editaram o nome pelo painel acompanham a marca nova;
-- um nome já escolhido pela equipe é preservado.
UPDATE "Settings"
SET "libraryName" = 'Biblioteca NEABI-NI'
WHERE "libraryName" = 'Biblioteca NEABI';
