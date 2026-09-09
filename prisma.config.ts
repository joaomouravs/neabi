import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuração do Prisma 7.
 *
 * A partir da v7 a URL de conexão usada pelos comandos de migração vive aqui,
 * e o cliente em runtime recebe um driver adapter (ver `src/lib/prisma.ts`).
 *
 * `DIRECT_URL` vem primeiro de propósito. Provedores gerenciados (Neon,
 * Supabase) expõem duas URLs: uma através de um pooler, ótima para o tráfego
 * da aplicação, e uma direta. O pooler não sustenta as instruções DDL de uma
 * migração — usá-lo aqui faz `prisma migrate deploy` falhar de um jeito difícil
 * de diagnosticar. Em desenvolvimento as duas apontam para o mesmo lugar, então
 * a ordem não muda nada.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
