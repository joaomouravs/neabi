import { resolve } from "node:path";

/**
 * Contas criadas pelo seed (`npm run db:seed`).
 *
 * As senhas são de desenvolvimento e vivem em `.env.example`; em produção o
 * seed usa as variáveis SEED_*.
 */
export const MEMBER = {
  email: "usuario@neabi.local",
  password: process.env.SEED_MEMBER_PASSWORD ?? "neabi-usuario-2026",
};

export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@neabi.local",
  password: process.env.SEED_ADMIN_PASSWORD ?? "neabi-admin-2026",
};

export const EDITOR = {
  email: "editor@neabi.local",
  password: process.env.SEED_EDITOR_PASSWORD ?? "neabi-editor-2026",
};

/** Caminho do arquivo de sessão persistida de cada papel. */
export function storageStateFor(role: "member" | "admin" | "editor"): string {
  return resolve(process.cwd(), ".playwright", `${role}.json`);
}
