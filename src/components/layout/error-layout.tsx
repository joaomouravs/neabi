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
  children,
}: {
  code: string;
  title: string;
  description: string;
  reference?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-neabi-black">
      <div
        aria-hidden="true"
        className="neabi-pattern pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.05]"
      />

      <Container className="relative flex flex-1 flex-col justify-center py-16">
        <Link href="/" className="mb-14 inline-block self-start">
          <NeabiMark tone="dark" />
        </Link>

        <p className="font-mono text-[0.875rem] tracking-widest text-neabi-amber">
          {code}
        </p>

        <h1 className="mt-3 max-w-3xl text-balance font-display text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.95] text-neabi-cream">
          {title}
        </h1>

        <NeabiRule className="mt-7 w-24" />

        <p className="mt-7 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-neabi-cream/70">
          {description}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">{children}</div>

        {reference ? (
          <p className="mt-10 font-mono text-[0.75rem] text-neabi-cream/40">
            Referência técnica: {reference}
          </p>
        ) : null}
      </Container>

      <div aria-hidden="true" className="neabi-rule relative h-1.5 w-full" />
    </div>
  );
}
