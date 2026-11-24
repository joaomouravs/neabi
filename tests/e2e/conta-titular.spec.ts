import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { storageStateFor } from "./accounts";

/**
 * Direitos do titular (LGPD), pelo caminho que a pessoa percorre: criar conta,
 * baixar a cópia dos dados, excluir a conta e não conseguir mais entrar.
 *
 * Cada execução cria a própria conta — a exclusão é definitiva, então o teste
 * nunca usa uma conta do seed.
 */

test.describe.configure({ mode: "serial" });

const MARCA = `e2e-titular-${Date.now().toString(36)}`;
const EMAIL = `${MARCA}@exemplo.org`;
const SENHA = "senha longa do teste de exclusao";

test.describe("titular da conta", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("baixa os próprios dados e exclui a conta", async ({ page }) => {
    // O cadastro é limitado por origem; uma origem própria por execução.
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${Date.now() % 250}.${Math.floor(Math.random() * 250)}.9`,
    });

    await page.goto("/login");
    await page.getByRole("tab", { name: "Criar conta" }).click();
    await page.getByLabel(/^Nome completo/).fill("Titular do Teste");
    await page.getByLabel(/^E-mail/).fill(EMAIL);
    await page.getByLabel(/^Senha/).fill(SENHA);
    await page.getByLabel(/^Confirmar senha/).fill(SENHA);
    await page.getByRole("button", { name: "Criar conta" }).last().click();
    await page.waitForURL("**/minha-conta");

    await page.goto("/minha-conta/perfil");
    await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();

    // Cópia dos dados: arquivo JSON com o cadastro da própria conta.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Baixar meus dados" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^meus-dados-biblioteca-neabi-\d{4}-\d{2}-\d{2}\.json$/);
    const conteudo = JSON.parse(await readFile((await download.path())!, "utf-8"));
    expect(conteudo.conta.email).toBe(EMAIL);
    expect(conteudo.conta.nome).toBe("Titular do Teste");

    // Primeiro clique só abre o formulário.
    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    await expect(page.getByText("Esta ação não pode ser desfeita")).toBeVisible();

    // Sem a confirmação marcada, nada acontece.
    await page.getByLabel(/^Confirme com a sua senha/).fill(SENHA);
    await page.getByRole("button", { name: "Excluir definitivamente" }).click();
    await expect(page.getByText(/Marque a caixa para confirmar/)).toBeVisible();

    // Senha errada também não.
    await page.getByLabel(/^Confirme com a sua senha/).fill("senha errada qualquer");
    await page.getByLabel(/serão apagados definitivamente/).check();
    await page.getByRole("button", { name: "Excluir definitivamente" }).click();
    await expect(page.getByText("Senha incorreta.")).toBeVisible();

    // O formulário volta limpo após cada envio: a confirmação é pedida de novo.
    await page.getByLabel(/^Confirme com a sua senha/).fill(SENHA);
    await page.getByLabel(/serão apagados definitivamente/).check();
    await page.getByRole("button", { name: "Excluir definitivamente" }).click();
    await page.waitForURL("**/conta-excluida");
    await expect(page.getByRole("heading", { name: "Sua conta foi excluída" })).toBeVisible();

    // A sessão acabou: a área da conta manda para a entrada.
    await page.goto("/minha-conta/perfil");
    await page.waitForURL(/\/login/);

    // E as credenciais antigas não entram mais.
    await page.getByLabel(/^E-mail/).fill(EMAIL);
    await page.getByLabel(/^Senha/).fill(SENHA);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

    // O download também exige sessão.
    const resposta = await page.request.get("/api/minha-conta/dados");
    expect(resposta.status()).toBe(401);
  });
});

test.describe("administração", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("publica o encarregado de dados na página de privacidade", async ({ page }) => {
    await page.goto("/admin/configuracoes");

    const controlador = page.getByLabel(/^Controlador/);
    const encarregado = page.getByLabel(/^Encarregado \(DPO\)/);
    const emailEncarregado = page.getByLabel(/^E-mail do encarregado/);
    const anteriores = {
      controlador: await controlador.inputValue(),
      encarregado: await encarregado.inputValue(),
      email: await emailEncarregado.inputValue(),
    };

    try {
      await controlador.fill(`Instituição de teste ${MARCA}`);
      await encarregado.fill("Pessoa Encarregada");
      await emailEncarregado.fill("encarregado@exemplo.org");
      await page.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(page.getByText("Configurações salvas.")).toBeVisible();

      await page.goto("/privacidade");
      await expect(page.getByRole("heading", { name: "Quem responde pelos dados" })).toBeVisible();
      await expect(page.getByText(`Instituição de teste ${MARCA}`)).toBeVisible();
      await expect(page.getByRole("link", { name: "encarregado@exemplo.org" })).toBeVisible();
    } finally {
      // Devolve o que estava configurado antes do teste.
      await page.goto("/admin/configuracoes");
      await page.getByLabel(/^Controlador/).fill(anteriores.controlador);
      await page.getByLabel(/^Encarregado \(DPO\)/).fill(anteriores.encarregado);
      await page.getByLabel(/^E-mail do encarregado/).fill(anteriores.email);
      await page.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(page.getByText("Configurações salvas.")).toBeVisible();
    }
  });
});
