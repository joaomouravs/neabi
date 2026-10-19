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
      page.getByRole("heading", { level: 1, name: "Biblioteca NEABI-NI" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Acervo de estudos afro-brasileiros e indígenas", {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    // A busca do hero é um combobox com sugestões reais; Enter sem sugestão
    // escolhida leva ao acervo com o termo na URL.
    const busca = page
      .getByRole("combobox", { name: /buscar livros, autores ou temas/i })
      .first();
    await busca.fill("ancestralidade");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();

    await expect(page).toHaveURL(/\/acervo\?q=ancestralidade/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Acervo" }),
    ).toBeVisible();
    await expect(page.getByText(/resultados? para/)).toBeVisible();

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
    /**
     * A listagem é transmitida dentro de um `Suspense`: a resposta inicial traz
     * o esqueleto de carregamento e os cartões chegam depois. Contar os
     * `article` logo após o `goto` é uma corrida — em uma máquina lenta o teste
     * conta zero e acusa uma regressão de busca que não existe. Daí esperar a
     * primeira obra aparecer antes de contar, nos dois lados da comparação.
     */
    async function contarObras(url: string): Promise<number> {
      await page.goto(url);
      const cartoes = page.locator("main ul li article");
      await cartoes.first().waitFor({ state: "visible" });
      return cartoes.count();
    }

    const semAcento = await contarObras("/acervo?q=etnico");
    const comAcento = await contarObras("/acervo?q=étnico");

    expect(semAcento).toBeGreaterThan(0);
    expect(semAcento).toBe(comAcento);
  });

  test("filtro por categoria altera os resultados e a URL", async ({ page }) => {
    await page.goto("/acervo");

    await page.getByRole("link", { name: "Educação", exact: true }).first().click();

    await expect(page).toHaveURL(/category=educacao/);
    await expect(page.getByText("Filtros ativos:")).toBeVisible();

    // Limpar devolve o acervo completo.
    await page.getByRole("button", { name: "Limpar filtros" }).first().click();
    await expect(page).toHaveURL(/\/acervo$/);
  });

  test("sugestões da busca vêm do acervo e avisam quando nada é encontrado", async ({
    page,
  }) => {
    await page.goto("/acervo");
    const busca = page.getByRole("combobox").first();

    await busca.fill("relações");
    await expect(
      page.getByRole("option", { name: /Relações Étnico-Raciais e Educação no Brasil/ }),
    ).toBeVisible();

    await busca.fill("zzzznaoexistenoacervo");
    await expect(page.getByText("Nenhum resultado encontrado")).toBeVisible();
    await expect(page.getByRole("option", { name: "Ver todos os resultados" })).toBeVisible();
  });

  test("busca sem resultado mostra estado vazio, não erro", async ({ page }) => {
    await page.goto("/acervo?q=zzzznaoexistenoacervo");

    await expect(
      page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
    ).toBeVisible();
    await expect(page.getByText(/Não encontramos obras para/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Limpar filtros" }).first()).toBeVisible();
  });

  test("obra inexistente responde com a página 404 do NEABI", async ({ page }) => {
    const response = await page.goto("/acervo/obra-que-nunca-existiu");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();

    // Dentro do layout do site: um só `main`, alvo do "Pular para o
    // conteúdo" — a página de erro não repete marca nem `main` próprios.
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("#conteudo")).toHaveCount(1);
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
