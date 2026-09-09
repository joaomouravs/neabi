import { expect, test, type Page } from "@playwright/test";

import { storageStateFor } from "./accounts";

/**
 * Responsividade das rotas principais.
 *
 * A verificação é sempre a mesma: em nenhuma largura o documento pode rolar
 * horizontalmente. É um teste barato que pega uma classe de defeito difícil de
 * enxergar a olho nu — um descendente absoluto que escapa do recorte de um
 * contêiner `overflow-x-auto`, um rótulo que não cabe, uma tabela sem contêiner
 * de rolagem própria — e que, quando aparece, quebra a leitura no celular.
 *
 * As larguras cobrem os aparelhos reais que a comunidade usa (iPhone SE até
 * Android grande), o tablet e as três faixas de desktop.
 */

const LARGURAS = [375, 390, 430, 768, 1024, 1280, 1440] as const;

/** Rotas abertas, sem sessão. */
const ROTAS_PUBLICAS = [
  "/",
  "/acervo",
  "/acervo?q=africa",
  "/acervo?q=zzzzsemresultado",
  "/sobre",
  "/contato",
  "/login",
  "/rota-que-nao-existe",
] as const;

/** Rotas da área da pessoa usuária. */
const ROTAS_CONTA = [
  "/minha-conta",
  "/minha-conta/reservas",
  "/minha-conta/historico",
] as const;

/** Rotas do painel administrativo. */
const ROTAS_ADMIN = [
  "/admin",
  "/admin/acervo",
  "/admin/exemplares",
  "/admin/categorias",
  "/admin/reservas",
  "/admin/usuarios",
  "/admin/arquivos",
  "/admin/analytics",
  "/admin/configuracoes",
] as const;

/**
 * Mede a sobra horizontal do documento.
 *
 * Um pixel de folga absorve arredondamento de subpixel do próprio navegador.
 */
async function sobraHorizontal(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raiz = document.documentElement;
    return raiz.scrollWidth - raiz.clientWidth;
  });
}

async function verificaRota(page: Page, rota: string, largura: number) {
  await page.setViewportSize({ width: largura, height: 900 });
  await page.goto(rota);
  await page.waitForLoadState("networkidle");

  expect(
    await sobraHorizontal(page),
    `${rota} rola horizontalmente em ${largura}px`,
  ).toBeLessThanOrEqual(1);
}

test.describe("responsividade", () => {
  // Uma única sessão de navegador por bloco: trocar de viewport é barato,
  // recarregar a rota é o custo real.
  test.describe("rotas públicas", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const largura of LARGURAS) {
      test(`sem rolagem horizontal em ${largura}px`, async ({ page }) => {
        for (const rota of ROTAS_PUBLICAS) {
          await verificaRota(page, rota, largura);
        }

        // A ficha de uma obra tem a coluna de disponibilidade, que é o ponto
        // mais apertado do layout — vale conferir uma de verdade.
        await page.goto("/acervo");
        await page.waitForLoadState("networkidle");
        const primeira = page.locator("main ul li article h3 a").first();
        const href = await primeira.getAttribute("href");
        expect(href).toBeTruthy();
        await verificaRota(page, href!, largura);
      });
    }
  });

  test.describe("área da pessoa usuária", () => {
    test.use({ storageState: storageStateFor("member") });

    for (const largura of LARGURAS) {
      test(`sem rolagem horizontal em ${largura}px`, async ({ page }) => {
        for (const rota of ROTAS_CONTA) {
          await verificaRota(page, rota, largura);
        }
      });
    }
  });

  test.describe("painel administrativo", () => {
    test.use({ storageState: storageStateFor("admin") });

    for (const largura of LARGURAS) {
      test(`sem rolagem horizontal em ${largura}px`, async ({ page }) => {
        for (const rota of ROTAS_ADMIN) {
          await verificaRota(page, rota, largura);
        }

        // A ficha de edição concentra tabelas e formulários largos: é onde a
        // rolagem horizontal aparecia antes de os contêineres ganharem
        // contexto de posicionamento.
        await page.goto("/admin/acervo");
        await page.waitForLoadState("networkidle");
        const editar = page.getByRole("link", { name: "Editar" }).first();
        const href = await editar.getAttribute("href");
        expect(href).toBeTruthy();
        await verificaRota(page, href!, largura);
      });
    }
  });
});
