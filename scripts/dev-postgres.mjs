/**
 * PostgreSQL local para desenvolvimento.
 *
 * Sobe uma instância real do PostgreSQL a partir de binários embarcados, sem
 * exigir instalação no sistema nem Docker. É o mesmo motor usado em produção,
 * então extensões, tipos e comportamento transacional são idênticos.
 *
 * Em produção, aponte `DATABASE_URL` para um PostgreSQL gerenciado (Neon,
 * Supabase, RDS…) e não use este script.
 *
 *   npm run db:dev
 */
import EmbeddedPostgresModule from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const EmbeddedPostgres = EmbeddedPostgresModule.default ?? EmbeddedPostgresModule;

const databaseDir = resolve(process.cwd(), ".postgres");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const databaseName = process.env.DEV_DB_NAME ?? "neabi";

const postgres = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  onLog: () => {},
  onError: (message) => process.stderr.write(String(message)),
});

const alreadyInitialised = existsSync(resolve(databaseDir, "PG_VERSION"));

if (!alreadyInitialised) {
  console.info("[dev-postgres] inicializando o cluster (só na primeira vez)…");
  await postgres.initialise();
}

await postgres.start();

// `createDatabase` falha se o banco já existir — o que é esperado a partir da
// segunda execução.
try {
  await postgres.createDatabase(databaseName);
  console.info(`[dev-postgres] banco "${databaseName}" criado`);
} catch {
  /* já existe */
}

console.info(
  `[dev-postgres] pronto em postgresql://postgres:postgres@127.0.0.1:${port}/${databaseName}`,
);
console.info("[dev-postgres] Ctrl+C para encerrar.");

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  console.info("\n[dev-postgres] encerrando…");
  await postgres.stop().catch(() => {});
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
