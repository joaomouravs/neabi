import Link from "next/link";
import type { ReactNode } from "react";

import { NeabiMark } from "./neabi-mark";
import { Container, NeabiRule } from "./primitives";

/**
 * Página de erro com a identidade NEABI.
 *
 * Mesmo o erro é uma página do produto: fundo institucional, tipografia
 * editorial, grafismo discreto e uma saída óbvia. Nada de tela branca com
 * traço técnico.
 */
export function ErrorLayout({
  code,
  title,
  description,
  reference,
  aside,
  children,
}: {
  code: string;
  title: string;
  description: string;
  reference?: string;
  /** Conteúdo extra abaixo das ações — a busca, na 404. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="on-dark relative flex min-h-dvh flex-col overflow-hidden bg-neabi-black text-neabi-cream">
      <div aria-hidden="true" className="neabi-rule relative h-1.5 w-full" />
      <div
        aria-hidden="true"
        className="neabi-pattern pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.045]"
      />
      {/* O código gigante é grafismo: o título abaixo já comunica o erro. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 bottom-0 select-none font-display text-[clamp(10rem,32vw,26rem)] font-bold leading-[0.75] text-neabi-cream/[0.04]"
      >
        {code}
      </p>

      <Container className="relative flex h-[var(--header-height)] items-center">
        <Link href="/" aria-label="Biblioteca NEABI-NI — página inicial">
          <NeabiMark tone="dark" />
        </Link>
      </Container>

      <main id="conteudo" className="relative flex flex-1 items-center">
        <Container className="py-14 sm:py-20">
          <p className="font-mono text-[0.875rem] tracking-[0.3em] text-neabi-amber">
            Erro {code}
          </p>

          <h1 className="mt-4 max-w-3xl text-balance font-display text-display-lg font-bold text-neabi-cream">
            {title}
          </h1>

          <NeabiRule className="mt-7 w-24" />

          <p className="mt-7 max-w-xl text-pretty text-lede text-neabi-cream/75">{description}</p>

          <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            {children}
          </div>

          {aside ? <div className="mt-12 border-t border-neabi-cream/15 pt-8">{aside}</div> : null}

          {reference ? (
            <p className="mt-10 font-mono text-[0.75rem] text-neabi-cream/45">
              Referência técnica: {reference}
            </p>
          ) : null}
        </Container>
      </main>
    </div>
  );
}
