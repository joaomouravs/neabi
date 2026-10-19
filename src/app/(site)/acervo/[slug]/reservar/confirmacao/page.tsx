import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookCover } from "@/components/books/book-cover";
import { Container } from "@/components/layout/primitives";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { shiftLabels } from "@/config/catalog";
import { formatLongDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { getActor } from "@/server/auth/session";
import { canViewReservation } from "@/server/permissions/rbac";
import { findReservationByProtocol } from "@/server/repositories/reservation-repository";
import { getSettings } from "@/server/repositories/settings-repository";

export const metadata: Metadata = {
  title: "Solicitação enviada",
  robots: { index: false, follow: false },
};

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReservationConfirmationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, query, actor] = await Promise.all([params, searchParams, getActor()]);

  if (!actor) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/acervo/${slug}`)}`);
  }

  const raw = query.protocolo;
  const protocol = Array.isArray(raw) ? raw[0] : raw;
  if (!protocol) notFound();

  const [reservation, settings] = await Promise.all([
    findReservationByProtocol(protocol),
    getSettings(),
  ]);

  // O protocolo não é segredo suficiente: a visualização exige ser o
  // solicitante ou ter permissão de gestão de reservas.
  if (!reservation || !canViewReservation(actor, reservation)) notFound();

  const location = [settings.institution, settings.campus, settings.address]
    .filter((part) => part && part.length > 0)
    .join(" — ");

  const steps = [
    { title: "Solicitação enviada", detail: "Recebemos seu pedido.", state: "done" },
    {
      title: "Análise da equipe",
      detail: "O NEABI confere a disponibilidade e a data escolhida.",
      state: "current",
    },
    {
      title: "Reserva aprovada",
      detail: "Só então o exemplar fica separado para você.",
      state: "next",
    },
  ] as const;

  return (
    <Container size="narrow" className="pb-20 pt-10 sm:pt-14">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="relative mx-auto flex size-16 items-center justify-center bg-neabi-green text-white motion-safe:animate-fade-up"
        >
          <Check className="size-8" strokeWidth={2.5} />
        </div>
        <p className="eyebrow mt-6 text-neabi-green-700">Solicitação registrada</p>
        <h1 className="mt-3 text-balance font-display text-display-md font-bold text-ink-900">
          Solicitação enviada
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lede text-ink-600">
          Sua solicitação foi recebida e será analisada pela equipe do NEABI.
          Acompanhe o status em Minhas reservas.
        </p>
      </div>

      <div className="mt-10 overflow-hidden border border-border-strong bg-surface shadow-card">
        <div aria-hidden="true" className="neabi-rule h-1 w-full" />

        <div className="on-dark flex flex-col gap-4 bg-neabi-black px-5 py-6 text-neabi-cream sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="eyebrow text-neabi-amber">Protocolo</p>
            <p className="mt-2 break-all font-mono text-[1.625rem] font-semibold tracking-tight sm:text-3xl">
              {reservation.protocol}
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-neabi-cream/65">
              Guarde este número: ele identifica sua solicitação no atendimento.
            </p>
          </div>
          <CopyButton
            value={reservation.protocol}
            label="Copiar protocolo"
            successTitle="Protocolo copiado"
            variant="onDarkOutline"
            className="self-start sm:self-center"
          />
        </div>

        <div className="grid gap-6 px-5 py-6 sm:grid-cols-[6rem_minmax(0,1fr)] sm:px-8 sm:py-8">
          <div className="w-20 sm:w-24">
            <BookCover
              title={reservation.book.title}
              coverImage={reservation.book.coverImage}
              coverAlt={reservation.book.coverAlt}
              sizes="96px"
              decorative
            />
          </div>
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.12em] text-ink-500">Obra</p>
            <p className="mt-1 font-display text-2xl font-bold leading-tight text-ink-900">
              <Link
                href={`/acervo/${reservation.book.slug}`}
                className="underline decoration-ink-300 decoration-1 underline-offset-4 hover:decoration-neabi-red-600"
              >
                {reservation.book.title}
              </Link>
            </p>
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Detail label="Data solicitada" value={formatLongDate(reservation.requestedDate)} />
              <Detail label="Turno" value={shiftLabels[reservation.shift]} />
              <Detail label="Status" value={<ReservationStatusBadge status={reservation.status} />} />
              {location ? <Detail label="Local" value={location} /> : null}
            </dl>
          </div>
        </div>
      </div>

      <section aria-labelledby="proximos-passos" className="mt-8 border border-border bg-surface px-5 py-6 sm:px-8">
        <h2 id="proximos-passos" className="font-display text-2xl font-bold text-ink-900">
          Solicitação enviada não é reserva aprovada
        </h2>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
          Compareça ao NEABI somente depois que o status mudar para{" "}
          <strong className="font-semibold text-ink-900">Aprovada</strong> ou{" "}
          <strong className="font-semibold text-ink-900">Pronta para retirada</strong>.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              aria-current={step.state === "current" ? "step" : undefined}
              className={cn(
                "relative border-t-2 pt-4",
                step.state === "done" && "border-neabi-green",
                step.state === "current" && "border-neabi-amber",
                step.state === "next" && "border-border-strong",
              )}
            >
              <p className="flex items-center gap-2 font-sans text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 items-center justify-center text-[0.6875rem] font-bold",
                    step.state === "done" && "bg-neabi-green text-white",
                    step.state === "current" && "bg-neabi-amber text-ink-900",
                    step.state === "next" && "bg-neabi-cream-200 text-ink-600",
                  )}
                >
                  {step.state === "done" ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                {step.state === "done" ? "Concluído" : step.state === "current" ? "Agora" : "Depois"}
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-ink-900">{step.title}</p>
              <p className="mt-1 text-[0.875rem] leading-snug text-ink-600">{step.detail}</p>
            </li>
          ))}
        </ol>

        {settings.reservationInstructions ? (
          <div className="mt-6 border-l-2 border-neabi-amber bg-neabi-amber-050 px-5 py-4">
            <h3 className="eyebrow tracking-[0.12em] text-neabi-amber-900">Orientações</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-neabi-amber-900">
              {settings.reservationInstructions}
            </p>
          </div>
        ) : null}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href={`/minha-conta/reservas/${reservation.id}`}>
            Acompanhar minha reserva
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/acervo">Voltar ao acervo</Link>
        </Button>
      </div>
    </Container>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[0.75rem] font-semibold uppercase tracking-widest text-ink-500">
        {label}
      </dt>
      <dd className="mt-1 text-[0.9375rem] leading-snug text-ink-800">{value}</dd>
    </div>
  );
}
