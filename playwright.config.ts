// O `.env` precisa ser carregado antes de qualquer import que leia
// `process.env` — as contas do seed vêm de lá, sem valor padrão no código.
import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

import { storageStateFor } from "./tests/e2e/accounts";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

/**
 * Playwright.
 *
 * Reaproveita o servidor de desenvolvimento já em execução; se não houver um,
 * sobe o seu próprio. O banco precisa estar rodando (`npm run db:dev`) e
 * semeado (`npm run db:seed`) — os testes usam as contas do seed.
 *
 * O projeto `setup` autentica uma vez por papel e grava a sessão em disco; os
 * projetos de teste partem desse estado.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      testIgnore: /responsividade\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: storageStateFor("member") },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      testIgnore: /responsividade\.spec\.ts/,
      use: { ...devices["Pixel 7"], storageState: storageStateFor("member") },
      dependencies: ["setup"],
    },
    {
      // A suíte de responsividade define a própria viewport a cada caso, então
      // rodá-la nos dois projetos acima só repetiria o mesmo trabalho.
      name: "responsivo",
      testMatch: /responsividade\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: storageStateFor("member") },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
