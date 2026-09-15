import type { ReactNode } from "react";

import { BackToTop } from "@/components/layout/back-to-top";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getSessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/permissions/rbac";
import { getSettings } from "@/server/repositories/settings-repository";
import { listCategoriesWithCounts } from "@/server/repositories/taxonomy-repository";

/**
 * Casca do site público.
 *
 * O primeiro elemento focável da página é o link "Pular para o conteúdo"
 * (WCAG 2.4.1): quem navega por teclado ou leitor de tela não precisa
 * atravessar o cabeçalho inteiro a cada página.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [user, settings, categories] = await Promise.all([
    getSessionUser(),
    getSettings(),
    listCategoriesWithCounts(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-[100] bg-neabi-black px-4 py-3 font-sans text-sm font-semibold text-neabi-cream"
      >
        Pular para o conteúdo
      </a>

      <SiteHeader
        user={
          user
            ? {
                name: user.name ?? null,
                email: user.email ?? "",
                isStaff: canAccessAdmin({ id: user.id, role: user.role }),
              }
            : null
        }
      />

      {/* `tabIndex={-1}` recebe o foco do "pular conteúdo" e do "voltar ao
          topo" sem entrar na ordem de tabulação. */}
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <SiteFooter
        settings={settings}
        signedIn={Boolean(user)}
        categories={categories
          .filter((category) => category.bookCount > 0)
          .sort((a, b) => b.bookCount - a.bookCount)
          .map(({ slug, name }) => ({ slug, name }))}
      />

      <BackToTop />
    </div>
  );
}
