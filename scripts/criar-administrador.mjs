/**
 * Cria uma conta de administração — ou promove e reativa uma existente — com
 * uma senha temporária. Para recuperar o acesso ao painel quando ninguém tem
 * uma conta de administração utilizável (foi o que aconteceu em 19/11/2026,
 * depois da troca de banco: as únicas contas eram as de exemplo do seed, com
 * senhas que ninguém mais tinha).
 *
 * Uso (na raiz do projeto, com a conexão direta em `.env.neon` ou DIRECT_URL):
 *
 *   node scripts/criar-administrador.mjs <email> "<Nome completo>"
 *
 * A senha temporária NÃO aparece na tela: vai para um arquivo na pasta do
 * usuário do Windows, fora do repositório. Entre no site com ela, troque-a em
 * Minha conta → Perfil e apague o arquivo.
 *
 * A ação fica no registro de atividades (/admin/atividades), como feita por
 * script de manutenção.
 */
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const [emailArg, ...nameParts] = process.argv.slice(2);
const email = (emailArg ?? "").trim().toLowerCase();
const name = nameParts.join(" ").trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || name.length < 3) {
  console.error('Uso: node scripts/criar-administrador.mjs <email> "<Nome completo>"');
  process.exit(1);
}

function directUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  if (!existsSync(".env.neon")) return null;
  const line = readFileSync(".env.neon", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DIRECT_URL="));
  return line ? line.slice("DIRECT_URL=".length).trim().replace(/^"|"$/g, "") : null;
}

const url = directUrl();
if (!url) {
  console.error("Conexão direta não encontrada: defina DIRECT_URL ou crie .env.neon.");
  process.exit(1);
}

// 18 bytes aleatórios; o hash usa o mesmo custo do bcrypt que o sistema usa.
const temporaryPassword = randomBytes(18).toString("base64url");
const passwordHash = await bcrypt.hash(temporaryPassword, 12);

const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN");
  const existing = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    await client.query(
      `UPDATE "User" SET role = 'ADMIN', active = true, "passwordHash" = $2, "updatedAt" = now()
        WHERE id = $1`,
      [userId, passwordHash],
    );
  } else {
    userId = randomUUID();
    await client.query(
      `INSERT INTO "User" (id, email, name, role, active, "passwordHash", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'ADMIN', true, $4, now(), now())`,
      [userId, email, name, passwordHash],
    );
  }
  await client.query(
    `INSERT INTO "AuditLog" (id, event, "actorId", details, "createdAt")
     VALUES ($1, 'conta.senha_redefinida', NULL, $2, now())`,
    [randomUUID(), JSON.stringify({ userId, via: "script", papel: "ADMIN" })],
  );
  await client.query("COMMIT");

  const file = join(homedir(), "neabi-acesso-administracao.txt");
  writeFileSync(
    file,
    [
      "Biblioteca NEABI-NI — acesso de administração",
      "",
      `Endereço: https://neabiufcini.com.br/login`,
      `E-mail:   ${email}`,
      `Senha temporária: ${temporaryPassword}`,
      "",
      "1. Entre com estes dados.",
      "2. Troque a senha em Minha conta → Perfil.",
      "3. Apague este arquivo.",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  console.log(
    `${existing.rows.length > 0 ? "Conta promovida e reativada" : "Conta criada"} com papel de Administração.`,
  );
  console.log(`Senha temporária gravada em ${file} (não exibida aqui).`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Falhou, nada foi gravado:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
