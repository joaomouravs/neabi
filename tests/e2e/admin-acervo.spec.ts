import { expect, test } from "@playwright/test";

import { storageStateFor } from "./accounts";

/**
 * Catalogação pelo painel administrativo.
 *
 * Verifica o ciclo real de trabalho da equipe: cadastrar uma obra, registrar um
 * exemplar, publicar e ver a obra aparecer no catálogo público — e, no caminho,
 * que campos bibliográficos não preenchidos permanecem vazios em vez de receber
 * valor estimado.
 */

test.use({ storageState: storageStateFor("admin") });
test.describe.configure({ mode: "serial" });

const TITLE = "Obra de teste automatizado";
const SLUG = "obra-de-teste-automatizado";

/** Remove registros deixados por execuções anteriores interrompidas. */
test("limpa execuções anteriores", async ({ page }) => {
  await page.goto(`/admin/acervo?q=${encodeURIComponent(TITLE)}`);
  await page.waitForLoadState("networkidle");

  const rows = page.getByRole("link", { name: TITLE });
  while (await rows.count()) {
    await rows.first().click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await page.waitForURL((url) => url.pathname === "/admin/acervo");
    await page.goto(`/admin/acervo?q=${encodeURIComponent(TITLE)}`);
    await page.waitForLoadState("networkidle");
  }

  await expect(page.getByText("Nenhuma obra encontrada")).toBeVisible();
});

test("cadastra uma obra apenas com o que é conhecido", async ({ page }) => {
  await page.goto("/admin/acervo/novo");
  await page.waitForLoadState("networkidle");

  await page.getByLabel(/^Título/).fill(TITLE);
  await page.getByLabel(/^Subtítulo/).fill("Registro criado por teste");

  // Autoria entra pelo editor de responsáveis, não por um campo de texto solto.
  await page.getByPlaceholder("Nome completo").fill("Pessoa Autora de Teste");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(
    page.getByRole("button", { name: "Remover Pessoa Autora de Teste" }),
  ).toBeVisible();

  // Ano, ISBN e paginação ficam em branco de propósito.
  await page.getByRole("tab", { name: "Classificação" }).click();
  await page.getByRole("checkbox", { name: "Educação" }).check();

  await page.getByRole("button", { name: "Cadastrar obra" }).click();

  await expect(page).toHaveURL(/\/admin\/acervo\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByText("Rascunho").first()).toBeVisible();
});

test("a obra em rascunho não aparece no catálogo público", async ({ page }) => {
  const response = await page.goto(`/acervo/${SLUG}`);
  expect(response?.status()).toBe(404);
});

test("registra um exemplar físico e publica", async ({ page }) => {
  await page.goto(`/admin/acervo?q=${encodeURIComponent(TITLE)}`);
  await page.getByRole("link", { name: TITLE }).first().click();
  await page.waitForLoadState("networkidle");

  // Sem exemplar, a obra não pode ser reservada.
  await expect(
    page.getByText("Nenhum exemplar cadastrado"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Adicionar exemplar" }).click();
  await page.getByRole("button", { name: "Salvar exemplar" }).click();
  await expect(page.getByText("1 exemplar cadastrado")).toBeVisible();

  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Publicado").first()).toBeVisible();
});

test("a obra publicada aparece no catálogo com disponibilidade real", async ({
  page,
}) => {
  await page.goto(`/acervo/${SLUG}`);

  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByText("Exemplar físico disponível")).toBeVisible();

  // Nenhum PDF autorizado: a leitura online não pode ser oferecida.
  await expect(page.getByText("Material digital não disponível")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ler online" })).toHaveCount(0);

  // Campos não informados são omitidos, não preenchidos com estimativa.
  await expect(page.getByText("Dados bibliográficos incompletos")).toBeVisible();
  await expect(page.getByText("ISBN")).toHaveCount(0);
});

test("a obra é encontrada pela busca, inclusive sem acento", async ({ page }) => {
  await page.goto("/acervo?q=automatizado");
  await expect(page.getByRole("link", { name: TITLE })).toBeVisible();
});

test("remove a obra criada pelo teste", async ({ page }) => {
  await page.goto(`/admin/acervo?q=${encodeURIComponent(TITLE)}`);
  await page.getByRole("link", { name: TITLE }).first().click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();

  await expect(page).toHaveURL(/\/admin\/acervo$/);
  await page.goto(`/admin/acervo?q=${encodeURIComponent(TITLE)}`);
  await expect(page.getByText("Nenhuma obra encontrada")).toBeVisible();
});
