import { ArrowLeft, Calendar, History, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { BookCover } from "@/components/books/book-cover";
import { CoverComposition } from "@/components/home/cover-composition";
import { NeabiMark } from "@/components/layout/neabi-mark";
import { Eyebrow, NeabiRule } from "@/components/layout/primitives";
import { categoryTone } from "@/config/catalog";
import { getActor } from "@/server/auth/session";
import {
  findBookBySlug,
  findFeaturedBooks,
  getPublicCatalogStats,
} from "@/server/repositories/book-repository";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta para solicitar e acompanhar reservas no acervo do NEABI.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BENEFITS = [
  { icon: Calendar, text: "Solicite a consulta presencial de qualquer obra disponível." },
  { icon: Search, text: "Acompanhe o status de cada pedido pelo protocolo." },
  { icon: History, text: "Guarde o histórico das obras que você já consultou." },
];

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
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

  // Vindo do botão de reserva: mostramos a obra que a pessoa queria reservar.
  const reserveMatch = /^\/acervo\/([a-z0-9-]+)\/reservar/.exec(callbackUrl);
  const [books, stats, pendingBook] = await Promise.all([
    findFeaturedBooks(3),
    getPublicCatalogStats(),
    reserveMatch ? findBookBySlug(reserveMatch[1]) : Promise.resolve(null),
  ]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
      <main id="conteudo" className="flex min-w-0 flex-col px-5 pb-8 pt-5 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Biblioteca NEABI-NI — página inicial">
            <NeabiMark />
          </Link>
          <Link
            href="/acervo"
            className="group hidden items-center gap-1.5 text-[0.875rem] font-medium text-ink-600 hover:text-ink-900 sm:inline-flex"
          >
            <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Voltar ao acervo
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-108 flex-1 flex-col justify-center py-10 sm:py-14">
          <Eyebrow>Sua conta</Eyebrow>
          <h1 className="mt-3 text-balance font-display text-display-sm font-bold text-ink-900">
            Entre ou crie sua conta
          </h1>
          <p className="mt-3 text-pretty text-[0.9375rem] leading-relaxed text-ink-600">
            Para solicitar reservas presenciais e acompanhar seus pedidos. Consultar o
            acervo é livre e não exige cadastro.
          </p>

          {pendingBook ? (
            <div className="mt-6 flex items-center gap-4 border border-border bg-surface p-3 pr-4">
              <div className="w-11 shrink-0">
                <BookCover
                  title={pendingBook.title}
                  coverImage={pendingBook.coverImage}
                  tone={categoryTone(pendingBook.categories[0]?.category.slug)}
                  sizes="44px"
                  decorative
                />
              </div>
              <p className="text-[0.875rem] leading-snug text-ink-700">
                Entre para concluir a reserva de{" "}
                <strong className="font-semibold text-ink-900">{pendingBook.title}</strong>.
              </p>
            </div>
          ) : null}

          <div className="mt-8">
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <p className="mt-8 text-center text-[0.8125rem] text-ink-500 sm:hidden">
            <Link href="/acervo" className="underline underline-offset-4 hover:text-ink-800">
              Voltar ao acervo
            </Link>
          </p>
        </div>

        <p className="text-[0.75rem] text-ink-500">CEFET/RJ · Campus Nova Iguaçu</p>
      </main>

      <aside
        aria-label="Sobre a Biblioteca NEABI-NI"
        className="on-dark relative hidden overflow-hidden bg-neabi-black text-neabi-cream lg:block"
      >
        <div aria-hidden="true" className="neabi-rule absolute inset-x-0 top-0 h-1.5" />
        <div
          aria-hidden="true"
          className="neabi-pattern-diamonds pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.045]"
        />
        <div className="relative flex h-full min-h-dvh flex-col justify-center gap-10 p-12 xl:p-16">
          {books.length > 0 ? (
            <div className="max-w-104">
              <CoverComposition books={books} />
            </div>
          ) : null}

          <div className="max-w-md">
            <blockquote>
              <p className="text-balance font-display text-[2.25rem] font-semibold leading-[1.05]">
                Memória, conhecimento e ancestralidade ao alcance da comunidade.
              </p>
            </blockquote>
            <NeabiRule className="mt-6" />
            <ul className="mt-7 flex flex-col gap-3.5">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-[0.9375rem] leading-snug text-neabi-cream/80">
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-neabi-amber" />
                  {text}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[0.8125rem] text-neabi-cream/55">
              {stats.books} {stats.books === 1 ? "obra catalogada" : "obras catalogadas"} ·{" "}
              {stats.categories} {stats.categories === 1 ? "eixo temático" : "eixos temáticos"} ·
              Núcleo de Estudos Afro-Brasileiros e Indígenas
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
