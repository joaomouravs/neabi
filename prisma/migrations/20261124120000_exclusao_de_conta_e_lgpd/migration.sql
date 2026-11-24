-- Exclusão da conta pelo titular e dados de proteção de dados (LGPD).
-- Só acrescenta colunas anuláveis ou com valor padrão: compatível com o
-- código anterior, que não as lê.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "dataController" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dpoName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dpoEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dataRetention" TEXT NOT NULL DEFAULT '';
