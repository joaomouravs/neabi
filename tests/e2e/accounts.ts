import { resolve } from "node:path";

/**
 * Contas criadas pelo seed (`npm run db:seed`).
 *
 * As senhas são de desenvolvimento e vivem em `.env.example`; em produção o
 * seed usa as variáveis SEED_*.
 */
/**
 * Não há senha padrão aqui, e isso é intencional.
 *
 * Um valor de reserva no código de teste é uma credencial versionada: continua
 * funcionando em qualquer ambiente onde o seed tenha rodado com o mesmo padrão.
 * As senhas vêm do `.env` — o mesmo arquivo que o seed leu ao criar as contas.
 */
function senhaDeSeed(variavel: string): string {
  const valor = process.env[variavel];
  if (!valor) {
    throw new Error(
      `${variavel} não está definida. Os testes E2E usam as contas do seed: ` +
        "configure o .env (ver .env.example) e rode `npm run db:seed`.",
    );
  }
  return valor;
}

export const MEMBER = {
  email: "usuario@neabi.local",
  get password() {
    return senhaDeSeed("SEED_MEMBER_PASSWORD");
  },
};

export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@neabi.local",
  get password() {
    return senhaDeSeed("SEED_ADMIN_PASSWORD");
  },
};

export const EDITOR = {
  email: "editor@neabi.local",
  get password() {
    return senhaDeSeed("SEED_EDITOR_PASSWORD");
  },
};

/** Caminho do arquivo de sessão persistida de cada papel. */
export function storageStateFor(role: "member" | "admin" | "editor"): string {
  return resolve(process.cwd(), ".playwright", `${role}.json`);
}
