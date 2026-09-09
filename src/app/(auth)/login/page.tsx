import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { NeabiMark } from "@/components/layout/neabi-mark";
import { getActor } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse sua conta para solicitar e acompanhar reservas no acervo do NEABI.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = params.callbackUrl;
  const requested = Array.isArray(raw) ? raw[0] : raw;

  // Só aceitamos caminhos internos como destino pós-login.
  const callbackUrl =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/minha-conta";

  // Quem já está autenticado não precisa ver esta página.
  const actor = await getActor();
  if (actor) redirect(callbackUrl);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-block">
            <NeabiMark />
          </Link>

          <h1 className="mt-10 font-display text-[clamp(2rem,4vw,2.75rem)] font-bold leading-tight text-ink-900">
            Sua conta na Biblioteca NEABI
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
            Entre para solicitar reservas presenciais e acompanhar seus pedidos.
            A consulta ao acervo é livre e não exige cadastro.
          </p>

          <div className="mt-10">
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <p className="mt-10 text-[0.875rem] text-ink-500">
            <Link
              href="/"
              className="underline underline-offset-4 hover:text-ink-800"
            >
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-neabi-black lg:block">
        <div
          aria-hidden="true"
          className="neabi-pattern-diamonds absolute inset-0 text-neabi-cream opacity-[0.07]"
        />
        <div aria-hidden="true" className="neabi-rule absolute inset-x-0 top-0 h-1.5" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <blockquote className="max-w-md">
            <p className="text-balance font-display text-[2.25rem] font-semibold leading-[1.08] text-neabi-cream">
              Memória, conhecimento e ancestralidade ao alcance da comunidade.
            </p>
            <footer className="mt-6 text-[0.9375rem] text-neabi-cream/60">
              Núcleo de Estudos Afro-Brasileiros e Indígenas — CEFET/RJ, campus
              Nova Iguaçu
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
