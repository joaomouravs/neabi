import { expect, test as setup } from "@playwright/test";

import { ADMIN, EDITOR, MEMBER, storageStateFor } from "./accounts";

/**
 * Autenticação dos testes.
 *
 * Entramos uma única vez por papel e guardamos a sessão em disco; os demais
 * testes reaproveitam esse estado. Além de deixar a suíte bem mais rápida,
 * isso evita disparar o limite de tentativas de login — que é um comportamento
 * desejado do produto, não um obstáculo a contornar afrouxando a regra.
 */

setup("autentica a pessoa usuária", async ({ page }) => {
  await signIn(page, MEMBER);
  await page.context().storageState({ path: storageStateFor("member") });
});

setup("autentica a administração", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.context().storageState({ path: storageStateFor("admin") });
});

setup("autentica a edição", async ({ page }) => {
  await signIn(page, EDITOR);
  await page.context().storageState({ path: storageStateFor("editor") });
});

async function signIn(
  page: import("@playwright/test").Page,
  user: { email: string; password: string },
) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/^E-mail/).fill(user.email);
  await page.getByLabel(/^Senha/).fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await expect(page).not.toHaveURL(/\/login/);
}
