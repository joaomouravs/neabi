/**
 * Monta as variáveis de produção da Netlify e as envia ao site.
 *
 * Uso (na raiz do projeto):
 *
 *   1. Crie `.env.neon` com as duas conexões do banco, copiadas do painel da
 *      Neon (Connect → "Pooled connection" ligado e desligado):
 *
 *        DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
 *        DIRECT_URL="postgresql://.../neondb?sslmode=require"
 *
 *   2. node scripts/preparar-env-netlify.mjs <nome-do-site> <url-publica>
 *      ex.: node scripts/preparar-env-netlify.mjs biblioteca-neabi-ni https://biblioteca-neabi-ni.netlify.app
 *
 * O script gera AUTH_SECRET e CRON_SECRET novos, grava tudo num arquivo
 * temporário, importa com `netlify env:import` e apaga o arquivo. Nenhum valor
 * é impresso. Os dois `.env.*` são ignorados pelo Git.
 *
 * Variáveis que NÃO vão para a produção: SEED_* (o seed nunca roda em produção
 * — ele redefine senhas) e as de S3/Blob da Vercel.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const [site, publicUrl] = process.argv.slice(2);
if (!site || !publicUrl || !/^https:\/\//.test(publicUrl)) {
  console.error("Uso: node scripts/preparar-env-netlify.mjs <nome-do-site> <https://url-publica>");
  process.exit(1);
}

if (!existsSync(".env.neon")) {
  console.error("Crie .env.neon com DATABASE_URL e DIRECT_URL (ver o cabeçalho deste script).");
  process.exit(1);
}

const neon = Object.fromEntries(
  readFileSync(".env.neon", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const postgres = /^postgres(ql)?:\/\/[^@]+@[^/]+\/\S+$/;
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  if (!postgres.test(neon[name] ?? "")) {
    console.error(`${name} ausente ou inválida em .env.neon.`);
    process.exit(1);
  }
}
if (neon.DATABASE_URL === neon.DIRECT_URL || !neon.DATABASE_URL.includes("-pooler")) {
  console.warn(
    "Aviso: DATABASE_URL deveria ser a conexão com pooler (host com \"-pooler\") e DIRECT_URL, a direta.",
  );
}

const url = publicUrl.replace(/\/+$/, "");
const vars = {
  DATABASE_URL: neon.DATABASE_URL,
  DIRECT_URL: neon.DIRECT_URL,
  AUTH_SECRET: randomBytes(48).toString("base64"),
  AUTH_URL: url,
  AUTH_TRUST_HOST: "true",
  NEXT_PUBLIC_SITE_URL: url,
  STORAGE_DRIVER: "netlify",
  NEXT_PUBLIC_STORAGE_BASE_URL: "/api/arquivos",
  MAIL_DRIVER: "console",
  MAIL_FROM: "Biblioteca NEABI-NI <nao-responda@neabi.local>",
  RATE_LIMIT_ENABLED: "true",
  CRON_SECRET: randomBytes(32).toString("hex"),
};

const file = ".env.netlify";
writeFileSync(file, Object.entries(vars).map(([k, v]) => `${k}="${v}"`).join("\n") + "\n", {
  mode: 0o600,
});

try {
  const result = spawnSync("npx", ["--no-install", "netlify", "env:import", file, "--site", site], {
    stdio: ["ignore", "ignore", "inherit"],
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error("netlify env:import falhou (veja a mensagem acima).");
    process.exit(result.status ?? 1);
  }
  console.log(`Variáveis enviadas ao site ${site}: ${Object.keys(vars).join(", ")}.`);
} finally {
  rmSync(file, { force: true });
}
