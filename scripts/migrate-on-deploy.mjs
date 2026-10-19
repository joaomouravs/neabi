/**
 * Migrações aplicadas pelo deploy de produção.
 *
 * Roda dentro de `npm run build`, antes do `next build`. Sem esta etapa, o
 * código novo entra no ar contra um banco antigo: foi assim que a home e o
 * catálogo passaram um mês respondendo 500 em produção, consultando a coluna
 * `Book.sortTitle` que nenhuma migração tinha criado.
 *
 * Só age quando a Vercel constrói o ambiente de produção. Preview e build local
 * passam direto: um branch em revisão não pode alterar o banco real, e quem
 * desenvolve aplica as migrações com `npm run db:migrate`.
 *
 * Migração exige conexão direta — o pooler do Neon não sustenta DDL. A ordem
 * de preferência cobre os nomes que a integração do Neon publica. Sem nenhuma
 * conexão direta válida, o build falha: melhor não publicar do que publicar
 * código contra um esquema desatualizado.
 *
 * Como o banco é migrado antes do código novo entrar no ar, toda migração
 * precisa ser compatível com a versão anterior do código (adicionar antes de
 * remover).
 */
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log(
    `[migrate-on-deploy] ambiente "${process.env.VERCEL_ENV ?? "local"}": migrações não aplicadas.`,
  );
  process.exit(0);
}

const CANDIDATAS = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const valida = (value) => /^postgres(ql)?:\/\/[^@]+@[^/]+\/\S+$/.test(value);

let escolhida = null;
for (const nome of CANDIDATAS) {
  const valor = (process.env[nome] ?? "").trim();
  if (valida(valor)) {
    escolhida = { nome, valor };
    break;
  }
  // O nome da variável é seguro de registrar; o valor, nunca.
  if (valor) console.warn(`[migrate-on-deploy] ${nome} definida, mas não é uma URL PostgreSQL válida.`);
}

if (!escolhida) {
  console.error(
    `[migrate-on-deploy] nenhuma conexão direta válida (${CANDIDATAS.join(", ")}). ` +
      "Build interrompido para não publicar código contra um banco sem migrações.",
  );
  process.exit(1);
}

console.log(`[migrate-on-deploy] aplicando migrações via ${escolhida.nome}.`);

const resultado = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DIRECT_URL: escolhida.valor },
});

process.exit(resultado.status ?? 1);
