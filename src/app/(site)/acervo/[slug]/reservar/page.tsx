import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookCover } from "@/components/books/book-cover";
import { formatCredit } from "@/components/books/book-card";
import { Container, NeabiRule } from "@/components/layout/primitives";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { ReservationSteps } from "@/components/reservations/reservation-steps";
import { Alert } from "@/components/ui/feedback";
import { toISODate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/server/auth/session";
import { findBookBySlug } from "@/server/repositories/book-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import { computeAvailability } from "@/server/services/availability";
import {
  firstAvailableDate,
  scheduleBounds,
} from "@/server/services/reservation-rules";

export const metadata: Metadata = {
  title: "Reserva presencial",
  robots: { index: false, follow: false },
};

type Params = Promise<{ slug: string }>;

export default async function ReservePage({ params }: { params: Params }) {
  const { slug } = await params;

  const actor = await getActor();
  if (!actor) {
    // A reserva exige autenticação; o catálogo não.
    redirect(`/login?callbackUrl=${encodeURIComponent(`/acervo/${slug}/reservar`)}`);
  }

  const [book, settings, user] = await Promise.all([
    findBookBySlug(slug),
    getSettings(),
    prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        name: true,
        email: true,
        phone: true,
        registrationId: true,
        patronType: true,
      },
    }),
  ]);

  if (!book) notFound();

  const availability = computeAvailability(book.copies, book.assets);
  const credit = formatCredit(book.contributors);

  const rules = {
    serviceDays: settings.serviceDays,
    availableShifts: settings.availableShifts,
    reservationLeadDays: settings.reservationLeadDays,
    reservationHorizonDays: settings.reservationHorizonDays,
  };
  const bounds = scheduleBounds(rules);
  const suggested = firstAvailableDate(rules);

  return (
    <Container className="py-12 sm:py-16">
      <nav aria-label="Trilha de navegação" className="mb-8">
        <Link
          href={`/acervo/${book.slug}`}
          className="text-[0.875rem] text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          ← Voltar para a obra
        </Link>
      </nav>

      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-tight text-ink-900">
        Reserva presencial
      </h1>
      <NeabiRule className="mt-5" />

      <div className="mt-10">
        <ReservationSteps current={2} />
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        <div className="min-w-0 order-2 lg:order-1">
          {availability.physicalAvailable ? (
            <ReservationForm
              bookSlug={book.slug}
              bookTitle={book.title}
              availableShifts={[...settings.availableShifts]}
              serviceDays={[...settings.serviceDays]}
              minDate={toISODate(bounds.min)}
              maxDate={toISODate(bounds.max)}
              defaultDate={suggested ? toISODate(suggested) : toISODate(bounds.min)}
              instructions={settings.reservationInstructions}
              defaults={{
                fullName: user?.name ?? "",
                email: user?.email ?? "",
                phone: user?.phone ?? "",
                registrationId: user?.registrationId ?? "",
                patronType: user?.patronType ?? null,
              }}
            />
          ) : (
            <Alert variant="warning" title="Exemplar indisponível no momento">
              {availability.hasPhysicalCopies
                ? "Todos os exemplares desta obra estão reservados ou em consulta. Tente novamente em alguns dias."
                : "Esta obra ainda não possui exemplar físico cadastrado para reserva."}
            </Alert>
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="border border-border-strong bg-surface p-5">
            <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Obra selecionada
            </p>
            <div className="mt-4 flex gap-4">
              <div className="w-24 shrink-0">
                <BookCover
                  title={book.title}
                  coverImage={book.coverImage}
                  coverAlt={book.coverAlt}
                  sizes="96px"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-pretty font-display text-lg font-semibold leading-tight text-ink-900">
                  {book.title}
                </h2>
                {book.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-ink-600">
                    {book.subtitle}
                  </p>
                ) : null}
                {credit ? (
                  <p className="mt-2 line-clamp-2 text-[0.8125rem] text-ink-500">
                    {credit}
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="mt-5 border-t border-border pt-4 text-[0.8125rem]">
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-ink-500">Local</dt>
                <dd className="text-right text-ink-800">
                  {settings.institution} — {settings.campus}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-ink-500">Exemplares livres</dt>
                <dd className="text-ink-800">{availability.availableCopies}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-ink-500">Prazo de retirada</dt>
                <dd className="text-ink-800">
                  {settings.pickupDeadlineDays}{" "}
                  {settings.pickupDeadlineDays === 1 ? "dia" : "dias"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </Container>
  );
}
