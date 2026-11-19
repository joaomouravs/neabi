import type { ReactNode } from "react";

import { BackToTop } from "@/components/layout/back-to-top";
import { SiteFooter } from "@/components/layout/site-footer";
import { SessionStateProvider } from "@/components/layout/session-state";
import { SiteHeader } from "@/components/layout/site-header";
import { getSettings } from "@/server/repositories/settings-repository";
import { listCategoriesWithCounts } from "@/server/repositories/taxonomy-repository";

/**
 * Casca do site público.
 *
 * O primeiro elemento focável da página é o link "Pular para o conteúdo"
 * (WCAG 2.4.1): quem navega por teclado ou leitor de tela não precisa
 * atravessar o cabeçalho inteiro a cada página.
 *
 * A casca não lê a sessão: fazer isso tornaria dinâmicas todas as páginas
 * públicas, inclusive as de texto fixo, e cada visita (e cada prefetch de
 * link) viraria uma renderização no servidor. Quem está conectado é
 * perguntado pelo navegador — ver `SessionStateProvider`.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [settings, categories] = await Promise.all([
    getSettings(),
    listCategoriesWithCounts(),
  ]);

  return (
    <SessionStateProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only-focusable absolute left-4 top-4 z-100 bg-neabi-black px-4 py-3 font-sans text-sm font-semibold text-neabi-cream"
        >
          Pular para o conteúdo
        </a>

        <SiteHeader />

        {/* `tabIndex={-1}` recebe o foco do "pular conteúdo" e do "voltar ao
            topo" sem entrar na ordem de tabulação. */}
        <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>

        <SiteFooter
          settings={settings}
          categories={categories
            .filter((category) => category.bookCount > 0)
            .sort((a, b) => b.bookCount - a.bookCount)
            .map(({ slug, name }) => ({ slug, name }))}
        />

        <BackToTop />
      </div>
    </SessionStateProvider>
  );
}
