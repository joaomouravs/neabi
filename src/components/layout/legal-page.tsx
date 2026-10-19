import type { ReactNode } from "react";

import { Container, PageHeader } from "./primitives";

/**
 * Estrutura das páginas institucionais de texto (acessibilidade, privacidade):
 * sumário lateral no desktop e medida de leitura confortável.
 */
export function LegalPage({
  eyebrow,
  title,
  description,
  sections,
  updated,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: { id: string; title: string; content: ReactNode }[];
  updated: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        breadcrumbs={[{ href: "/", label: "Início" }, { label: title }]}
      />
      <Container className="section-y-sm pb-20">
        <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Nesta página" className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-height-compact)+2rem)]">
              <p className="eyebrow tracking-[0.12em] text-ink-500">Nesta página</p>
              <ol className="mt-3 flex flex-col border-l border-border-strong">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="-ml-px block border-l-2 border-transparent py-2 pl-4 text-[0.875rem] leading-snug text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="max-w-176">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-titulo`}
                className="scroll-mt-28 border-t border-border py-8 first:border-t-0 first:pt-0"
              >
                <h2
                  id={`${section.id}-titulo`}
                  className="font-display text-[1.75rem] font-bold leading-tight text-ink-900"
                >
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-[1rem] leading-relaxed text-ink-700 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
            <p className="border-t border-border pt-6 text-[0.8125rem] text-ink-500">
              Última revisão: {updated}.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
