import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "pg";

/**
 * Aplica os índices de busca opcionais.
 *
 * Por que não é uma migração comum: a extensão `pg_trgm` exige privilégio para
 * ser criada e não está disponível em todo PostgreSQL gerenciado. Uma migração
 * que falha por falta de extensão trava o deploy inteiro por causa de uma
 * otimização — enquanto a busca funciona sem ela (`Book.searchText` guarda o
 * texto já normalizado e a consulta usa LIKE).
 *
 * Então: tentativa explícita, idempotente, e falha tratada como aviso.
 *
 *   npm run db:indices
 */
async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida. Configure o arquivo .env.");
  }

  const sql = await readFile(
    resolve(process.cwd(), "prisma/sql/search-indexes.sql"),
    "utf8",
  );

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(sql);
    console.info("[índices] pg_trgm e índices GIN aplicados.");
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    console.warn(
      "[índices] não foi possível aplicar os índices trigram:\n  " + mensagem,
    );
    console.warn(
      "[índices] a busca continua funcionando sem eles — apenas sem a\n" +
        "          aceleração do LIKE com curinga à esquerda.",
    );
    process.exitCode = 0; // aviso, não falha
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
