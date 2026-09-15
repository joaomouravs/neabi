import { expect, test, type Page } from "@playwright/test";

import { storageStateFor } from "./accounts";

/**
 * Reserva presencial e atendimento administrativo.
 *
 * Cobre a jornada completa: pedido pela pessoa usuária, aprovação pela equipe,
 * separação, retirada e devolução — verificando ao final que o exemplar voltou
 * ao acervo.
 *
 * As sessões vêm do projeto `setup`; nenhum teste refaz login, o que mantém a
 * suíte rápida e não esbarra no limite de tentativas — que é comportamento
 * desejado do produto, não obstáculo a contornar afrouxando a regra.
 */

/** Obra usada nos testes — tem exemplar físico cadastrado pelo seed. */
const BOOK_SLUG = "a-africa-explicada-aos-meus-filhos";

/** Compartilhado entre os blocos, que rodam em ordem. */
let protocol = "";

test.describe.configure({ mode: "serial" });

test.describe("visitante sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("é levado ao login ao tentar reservar", async ({ page }) => {
    await page.goto(`/acervo/${BOOK_SLUG}`);
    await page.getByRole("link", { name: "Reservar presencialmente" }).click();

    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });

  test("é levado ao login ao tentar acessar a área da conta", async ({ page }) => {
    await page.goto("/minha-conta");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("pessoa usuária", () => {
  test("parte de um estado sem reservas em andamento", async ({ page }) => {
    // Uma reserva ativa remanescente faria o servidor recusar a nova
    // solicitação. Cancelar pela interface também exercita esse fluxo.
    await page.goto("/minha-conta/reservas");
    await page.waitForLoadState("networkidle");

    const links = page.locator("main ul li a[href^='/minha-conta/reservas/']");
    while (await links.count()) {
      await links.first().click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Cancelar reserva" }).click();
      await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
      await expect(page.getByText("Reserva cancelada.")).toBeVisible();
      await page.goto("/minha-conta/reservas");
      await page.waitForLoadState("networkidle");
    }

    await expect(page.getByText("Nenhuma reserva em andamento")).toBeVisible();
  });

  test("solicita a reserva e recebe o protocolo", async ({ page }) => {
    await page.goto(`/acervo/${BOOK_SLUG}/reservar`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { level: 1, name: "Reserva presencial" }),
    ).toBeVisible();

    await page.getByLabel(/^Nome completo/).fill("Pessoa usuária de exemplo");
    await page.getByLabel(/^Telefone/).fill("(21) 98888-7777");
    await page.getByLabel(/^Tipo de usuário/).selectOption("VISITOR");
    await page
      .getByLabel(/^Finalidade da consulta/)
      .fill("Pesquisa para trabalho de conclusão de curso.");
    await page.getByLabel(/Declaro que li as orientações/).check();

    await page.getByRole("button", { name: "Solicitar reserva" }).click();

    await expect(page).toHaveURL(/\/reservar\/confirmacao\?protocolo=/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Solicitação enviada" }),
    ).toBeVisible();

    // A confirmação NÃO pode afirmar que o livro está reservado: ainda depende
    // da análise da equipe — e a página diz isso com todas as letras.
    await expect(
      page.getByText("Sua solicitação foi recebida e será analisada"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Solicitação enviada não é reserva aprovada" }),
    ).toBeVisible();
    await expect(page.getByText("Aguardando análise")).toBeVisible();

    protocol = new URL(page.url()).searchParams.get("protocolo") ?? "";
    expect(protocol).toMatch(/^NEABI-\d{4}-[A-Z0-9]{6}$/);
  });

  test("recusa segunda solicitação da mesma obra sem perder o preenchimento", async ({
    page,
  }) => {
    await page.goto(`/acervo/${BOOK_SLUG}/reservar`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/^Nome completo/).fill("Pessoa usuária de exemplo");
    await page.getByLabel(/^Telefone/).fill("(21) 97777-6666");
    await page.getByLabel(/^Tipo de usuário/).selectOption("RESEARCHER");
    await page.getByLabel(/^Finalidade da consulta/).fill("Segunda tentativa.");
    await page.getByLabel(/Declaro que li as orientações/).check();
    await page.getByRole("button", { name: "Solicitar reserva" }).click();

    await expect(
      page.getByText("Você já possui uma solicitação em andamento"),
    ).toBeVisible();

    // Quem corrige um erro não pode perder o que já preencheu.
    await expect(page.getByLabel(/^Telefone/)).toHaveValue("(21) 97777-6666");
    await expect(page.getByLabel(/^Tipo de usuário/)).toHaveValue("RESEARCHER");
    await expect(page.getByLabel(/^Finalidade da consulta/)).toHaveValue(
      "Segunda tentativa.",
    );
    await expect(page.getByLabel(/Declaro que li as orientações/)).toBeChecked();
  });

  test("acompanha a reserva em minhas reservas", async ({ page }) => {
    await page.goto("/minha-conta/reservas");

    await expect(
      page.getByRole("heading", { name: "Reservas em andamento" }),
    ).toBeVisible();
    await expect(page.getByText(protocol)).toBeVisible();
  });

  test("não acessa o painel administrativo", async ({ page }) => {
    const response = await page.goto("/admin");

    expect(response?.status()).toBe(403);
    await expect(
      page.getByRole("heading", { name: "Acesso não autorizado" }),
    ).toBeVisible();
  });
});

test.describe("equipe do NEABI", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("conduz a reserva da aprovação à devolução", async ({ page }) => {
    await page.goto("/admin/reservas?status=PENDING");
    await expect(
      page.getByRole("heading", { level: 1, name: "Reservas" }),
    ).toBeVisible();

    await page
      .getByRole("row")
      .filter({ hasText: protocol })
      .getByRole("link", { name: "Abrir" })
      .click();

    await expect(
      page.getByRole("heading", { level: 1, name: `Reserva ${protocol}` }),
    ).toBeVisible();

    // Aprovar designa um exemplar e o retira do acervo disponível.
    await applyAction(page, "Aprovar");
    await expect(page.getByText("Reserva atualizada.")).toBeVisible();
    await expect(page.getByText("Aprovada").first()).toBeVisible();

    await applyAction(page, "Preparar para retirada");
    await expect(page.getByText("Pronta para retirada").first()).toBeVisible();

    await applyAction(page, "Marcar como retirado");
    await expect(page.getByText("Em consulta").first()).toBeVisible();

    await applyAction(page, "Registrar devolução");
    await expect(page.getByText("Devolvida").first()).toBeVisible();

    // O exemplar precisa ter voltado ao acervo. O status aparece junto ao
    // título e no cartão de disponibilidade — basta o primeiro visível.
    await page.goto(`/acervo/${BOOK_SLUG}`);
    await expect(page.getByText(/Exemplar físico disponível/).first()).toBeVisible();
  });
});

test.describe("conclusão", () => {
  test("a reserva encerrada migra para o histórico da pessoa", async ({ page }) => {
    await page.goto("/minha-conta/historico");
    await expect(page.getByText(protocol)).toBeVisible();

    await page.goto("/minha-conta/reservas");
    await expect(page.getByText(protocol)).toHaveCount(0);
  });
});

/** Abre o painel de uma ação administrativa e confirma. */
async function applyAction(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page
    .getByRole("button", { name: new RegExp(`Confirmar: ${label}`) })
    .click();
}
