import { expect, test } from "@playwright/test";

/**
 * Fluxo público: home → acervo → busca → página da obra.
 *
 * Nenhuma etapa exige autenticação — é justamente o que precisa ser garantido.
 */

test.describe("catálogo público", () => {
  // O catálogo é público: estes casos rodam sem sessão alguma.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("da home até a página de uma obra", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Biblioteca NEABI" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Acervo de estudos afro-brasileiros e indígenas", {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    // A busca do hero leva ao acervo com o termo na URL.
    await page
      .getByRole("searchbox", { name: /buscar livros, autores ou temas/i })
      .first()
      .fill("ancestralidade");
    await page
      .getByRole("button", { name: "Buscar", exact: true })
      .first()
      .click();

    await expect(page).toHaveURL(/\/acervo\?q=ancestralidade/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Acervo" }),
    ).toBeVisible();
    await expect(page.getByText(/obras? encontradas?/)).toBeVisible();

    // Abre a primeira obra do resultado.
    const firstBook = page.locator("main ul li article h3 a").first();
    const title = (await firstBook.textContent())?.trim() ?? "";
    await firstBook.click();

    await expect(page).toHaveURL(/\/acervo\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

    // O painel de disponibilidade é obrigatório na página da obra.
    await expect(
      page.getByRole("heading", { name: "Disponibilidade" }),
    ).toBeVisible();
  });

  test("a busca ignora acentuação", async ({ page }) => {
    await page.goto("/acervo?q=etnico");
    await expect(page.getByText(/obras? encontradas?/)).toBeVisible();

    const withoutAccent = await page
      .locator("main ul li article")
      .count();

    await page.goto("/acervo?q=étnico");
    const withAccent = await page.locator("main ul li article").count();

    expect(withoutAccent).toBeGreaterThan(0);
    expect(withoutAccent).toBe(withAccent);
  });

  test("filtro por categoria altera os resultados e a URL", async ({ page }) => {
    await page.goto("/acervo");

    await page.getByRole("link", { name: "Educação", exact: true }).first().click();

    await expect(page).toHaveURL(/category=educacao/);
    await expect(page.getByText("Filtros ativos:")).toBeVisible();

    // Limpar devolve o acervo completo.
    await page.getByRole("button", { name: "Limpar tudo" }).click();
    await expect(page).toHaveURL(/\/acervo$/);
  });

  test("busca sem resultado mostra estado vazio, não erro", async ({ page }) => {
    await page.goto("/acervo?q=zzzznaoexistenoacervo");

    await expect(page.getByText("Nenhuma obra encontrada.")).toBeVisible();
    await expect(
      page.getByText("Tente pesquisar outro termo ou alterar os filtros."),
    ).toBeVisible();
  });

  test("obra inexistente responde com a página 404 do NEABI", async ({ page }) => {
    const response = await page.goto("/acervo/obra-que-nunca-existiu");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
  });

  test("acervo inicial não oferece leitura online", async ({ page }) => {
    await page.goto("/acervo/espirito-das-periferias");

    await expect(
      page.getByText("Material digital não disponível"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ler online" })).toHaveCount(0);
  });

  test("navegação por teclado alcança o link de pular conteúdo", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skipLink).toBeFocused();
  });
});
