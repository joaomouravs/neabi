import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuração do Prisma 7.
 *
 * A partir da v7 a URL de conexão usada pelos comandos de migração vive aqui,
 * e o cliente em runtime recebe um driver adapter (ver `src/lib/prisma.ts`).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
