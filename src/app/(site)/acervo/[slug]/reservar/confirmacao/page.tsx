import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Container, MetadataList, NeabiRule } from "@/components/layout/primitives";
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge";
import { ReservationSteps } from "@/components/reservations/reservation-steps";
import { Button } from "@/components/ui/button";
import { shiftLabels } from "@/config/catalog";
import { formatLongDate } from "@/lib/date";
import { getActor } from "@/server/auth/session";
import { canViewReservation } from "@/server/permissions/rbac";
import { findReservationByProtocol } from "@/server/repositories/reservation-repository";
import { getSettings } from "@/server/repositories/settings-repository";

export const metadata: Metadata = {
  title: "Reserva solicitada",
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
  const [{ slug }, query, actor] = await Promise.all([
    params,
    searchParams,
    getActor(),
  ]);

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

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <ReservationSteps current={3} />

      <div className="mt-12 border border-border-strong bg-surface">
        <div aria-hidden="true" className="neabi-rule h-1 w-full" />

        <div className="p-6 sm:p-9">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-neabi-green-700">
            Solicitação registrada
          </p>

          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-tight text-ink-900">
            Reserva solicitada com sucesso
          </h1>

          <NeabiRule className="mt-5" />

          <p className="mt-6 max-w-prose text-[1.0625rem] leading-relaxed text-ink-700">
            Sua solicitação foi recebida e será analisada pela equipe do NEABI.
            Você receberá um aviso por e-mail quando houver uma decisão.
          </p>

          <div className="mt-8 border border-border bg-neabi-cream-050 p-5">
            <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Protocolo
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-ink-900">
              {reservation.protocol}
            </p>
            <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">
              Guarde este número: ele identifica sua solicitação no atendimento.
            </p>
          </div>

          <div className="mt-8">
            <MetadataList
              items={[
                {
                  label: "Obra",
                  value: (
                    <Link
                      href={`/acervo/${reservation.book.slug}`}
                      className="underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red"
                    >
                      {reservation.book.title}
                    </Link>
                  ),
                },
                {
                  label: "Data solicitada",
                  value: formatLongDate(reservation.requestedDate),
                },
                { label: "Turno", value: shiftLabels[reservation.shift] },
                { label: "Local", value: location || null },
                {
                  label: "Status",
                  value: <ReservationStatusBadge status={reservation.status} />,
                },
              ]}
            />
          </div>

          {settings.reservationInstructions ? (
            <div className="mt-8 border-l-2 border-neabi-amber bg-neabi-amber-050 px-5 py-4">
              <h2 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-neabi-amber-900">
                Orientações
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-neabi-amber-900">
                {settings.reservationInstructions}
              </p>
            </div>
          ) : null}

          <div className="mt-9 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
            <Button asChild size="lg">
              <Link href={`/minha-conta/reservas/${reservation.id}`}>
                Acompanhar minha reserva
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/acervo">Continuar explorando o acervo</Link>
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
