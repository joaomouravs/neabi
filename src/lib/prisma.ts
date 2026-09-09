import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma único por processo.
 *
 * A partir do Prisma 7 a conexão é feita por driver adapter: o pool do `pg` é
 * criado aqui e reaproveitado entre recompilações no modo de desenvolvimento,
 * evitando esgotar as conexões do banco a cada hot reload.
 */

const globalForPrisma = globalThis as unknown as {
  neabiPrisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não está definida. Copie .env.example para .env e configure a conexão.",
    );
  }

  // O Postgres embarcado de desenvolvimento (PGlite) atende uma conexão por
  // vez. `DATABASE_POOL_MAX` permite limitar o pool nesse cenário sem afetar
  // um PostgreSQL de produção, onde o padrão do driver é adequado.
  const poolMax = process.env.DATABASE_POOL_MAX
    ? Number(process.env.DATABASE_POOL_MAX)
    : undefined;

  const adapter = new PrismaPg({
    connectionString,
    ...(poolMax && Number.isFinite(poolMax) ? { max: poolMax } : {}),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.neabiPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.neabiPrisma = prisma;
}
