import { expect, test, type Page } from "@playwright/test";

import { storageStateFor } from "./accounts";

/**
 * Mensagens de contato, do formulário público à caixa do painel.
 *
 * Em produção o envio de e-mail está desligado: se a mensagem não aparecer na
 * caixa do painel, ninguém da equipe a lê. Por isso o teste segue o caminho
 * inteiro — visitante envia, equipe lê, responde, arquiva — e confere cada
 * mudança de situação depois de recarregar a página.
 */

test.describe.configure({ mode: "serial" });

/** Assunto único por execução: encontra a mensagem sem depender do que já existe. */
const MARCA = `teste-e2e-${Date.now().toString(36)}`;

async function abreMenuSeNecessario(page: Page) {
  const abrir = page.getByRole("button", { name: "Abrir menu do painel" });
  if (await abrir.isVisible()) await abrir.click();
}

test.describe("visitante", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("envia uma mensagem pelo formulário de contato", async ({ page }) => {
    // O limite de envios é por origem. Uma origem própria por execução evita
    // que rodar a suíte duas vezes seguidas esbarre no limite — que continua
    // valendo para todo o resto.
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${Date.now() % 250}.${Math.floor(Math.random() * 250)}.7`,
    });

    await page.goto("/contato");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/^Nome/).fill("Visitante do Teste Automatizado");
    await page.getByLabel(/^E-mail/).fill("visitante.e2e@exemplo.org");
    await page.getByLabel(/^Assunto/).selectOption({ label: "Doação de obras" });
    await page
      .getByLabel(/^Mensagem/)
      .fill(`Mensagem criada pelo teste automatizado (${MARCA}). Pode ser excluída.`);

    // Envio instantâneo é tratado como robô; uma pessoa leva mais que isso.
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    await expect(page.getByText("Mensagem enviada")).toBeVisible();
  });
});

test.describe("administração", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("lê, responde e arquiva a mensagem", async ({ page }) => {
    await page.goto(`/admin/mensagens?status=NEW&q=${MARCA}`);
    await page.waitForLoadState("networkidle");

    const linha = page.getByRole("row").filter({ hasText: MARCA });
    await expect(linha).toHaveCount(1);
    await expect(linha.getByText("Nova", { exact: true })).toBeVisible();

    await linha.getByRole("link", { name: "Abrir" }).click();
    await page.waitForURL(/\/admin\/mensagens\/[a-z0-9]+$/);
    const endereco = page.url();

    // Abrir a mensagem a marca como lida.
    await expect(page.getByText("Lida", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Lida", { exact: true })).toBeVisible();

    await expect(page.getByRole("link", { name: "Responder por e-mail" })).toHaveAttribute(
      "href",
      "mailto:visitante.e2e@exemplo.org?subject=Re%3A%20Doa%C3%A7%C3%A3o%20de%20obras",
    );

    await page.getByRole("button", { name: "Marcar como respondida" }).click();
    await expect(page.getByText("Respondida", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Respondida", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Arquivar" }).click();
    await expect(page.getByText("Arquivada", { exact: true })).toBeVisible();

    await page.goto(`/admin/mensagens?status=ARCHIVED&q=${MARCA}`);
    await expect(page.getByRole("row").filter({ hasText: MARCA })).toHaveCount(1);

    await page.goto(endereco);
    await expect(page.getByRole("button", { name: "Desarquivar" })).toBeVisible();
  });

  test("exclui a mensagem definitivamente", async ({ page }) => {
    await page.goto(`/admin/mensagens?q=${MARCA}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("row").filter({ hasText: MARCA }).getByRole("link", { name: "Abrir" }).click();
    await page.waitForURL(/\/admin\/mensagens\/[a-z0-9]+$/);

    await page.getByRole("button", { name: "Excluir mensagem" }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await page.waitForURL((url) => url.pathname === "/admin/mensagens");

    await page.goto(`/admin/mensagens?q=${MARCA}`);
    await expect(page.getByText("Nenhuma mensagem encontrada")).toBeVisible();
  });
});

test.describe("edição", () => {
  test.use({ storageState: storageStateFor("editor") });

  test("vê a caixa de mensagens, mas não as áreas exclusivas da administração", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await abreMenuSeNecessario(page);

    const menu = page.getByRole("navigation", { name: "Navegação administrativa" });
    await expect(menu.getByRole("link", { name: /^Mensagens/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /^Reservas/ })).toBeVisible();
    // Links que levariam a um 403 não aparecem.
    await expect(menu.getByRole("link", { name: "Usuários" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Configurações" })).toHaveCount(0);

    await page.goto("/admin/mensagens");
    await expect(page.getByRole("heading", { level: 1, name: "Mensagens" })).toBeVisible();
  });
});
