import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookCover } from "@/components/books/book-cover";
import { Breadcrumbs, Container, Eyebrow, NeabiRule } from "@/components/layout/primitives";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { categoryTone } from "@/config/catalog";
import { formatCredit } from "@/lib/credits";
import { toISODate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/server/auth/session";
import { findBookBySlug } from "@/server/repositories/book-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import {
  computeAvailability,
  physicalAvailabilityLabel,
} from "@/server/services/availability";
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
  const category = book.categories[0]?.category;

  const rules = {
    serviceDays: settings.serviceDays,
    availableShifts: settings.availableShifts,
    reservationLeadDays: settings.reservationLeadDays,
    reservationHorizonDays: settings.reservationHorizonDays,
  };
  const bounds = scheduleBounds(rules);
  const suggested = firstAvailableDate(rules);

  const summary = (
    <section
      aria-label="Obra selecionada"
      className="relative overflow-hidden border border-border-strong bg-surface shadow-card"
    >
      <div aria-hidden="true" className="neabi-rule h-1 w-full" />
      <div className="flex gap-4 p-4 sm:p-5 lg:flex-col lg:gap-5">
        <div className="w-[4.5rem] shrink-0 sm:w-20 lg:w-32">
          <BookCover
            title={book.title}
            coverImage={book.coverImage}
            coverAlt={book.coverAlt}
            tone={categoryTone(category?.slug)}
            categoryName={category?.name}
            credit={credit}
            sizes="(min-width: 1024px) 128px, 80px"
            decorative
          />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.12em] text-ink-500">Obra selecionada</p>
          <h2 className="mt-1.5 text-pretty font-display text-lg font-bold leading-tight text-ink-900 lg:text-[1.375rem]">
            {book.title}
          </h2>
          {book.subtitle ? (
            <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-ink-600">
              {book.subtitle}
            </p>
          ) : null}
          {credit ? (
            <p className="mt-1.5 line-clamp-2 text-[0.8125rem] text-ink-500">{credit}</p>
          ) : null}
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-neabi-green-700">
            <span
              aria-hidden="true"
              className={
                availability.physicalAvailable
                  ? "size-2 rounded-full bg-neabi-green"
                  : "size-2 rounded-full bg-neabi-amber"
              }
            />
            {physicalAvailabilityLabel(availability)}
          </p>
        </div>
      </div>

      <dl className="hidden border-t border-border px-5 py-4 text-[0.8125rem] lg:block">
        <div className="flex items-start justify-between gap-3 py-1">
          <dt className="text-ink-500">Local</dt>
          <dd className="text-right text-ink-800">
            {settings.institution} — {settings.campus}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-1">
          <dt className="text-ink-500">Exemplares livres</dt>
          <dd className="tabular-nums text-ink-800">{availability.availableCopies}</dd>
        </div>
        <div className="flex justify-between gap-3 py-1">
          <dt className="text-ink-500">Prazo de retirada</dt>
          <dd className="text-ink-800">
            {settings.pickupDeadlineDays} {settings.pickupDeadlineDays === 1 ? "dia" : "dias"} após a
            aprovação
          </dd>
        </div>
      </dl>
    </section>
  );

  return (
    <>
      <div className="border-b border-border bg-surface-muted">
        <Container className="py-3.5">
          <Breadcrumbs
            items={[
              { href: "/", label: "Início" },
              { href: "/acervo", label: "Acervo" },
              { href: `/acervo/${book.slug}`, label: book.title },
              { label: "Reserva presencial" },
            ]}
          />
        </Container>
      </div>

      <Container className="pb-20 pt-8 sm:pt-10 lg:pt-12">
        <header className="max-w-3xl">
          <Eyebrow>Solicitação de consulta</Eyebrow>
          <h1 className="mt-3 font-display text-display-md font-bold text-ink-900">
            Reserva presencial
          </h1>
          <NeabiRule className="mt-5" />
          <p className="mt-5 max-w-2xl text-pretty text-lede text-ink-600">
            Agende a consulta ou retirada desta obra no espaço do NEABI. São quatro
            passos curtos; a equipe analisa cada pedido antes de confirmar.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-[0.875rem] text-ink-500">
            <MapPin aria-hidden="true" className="size-4" />
            {settings.institution} · {settings.campus}
          </p>
        </header>

        <div className="mt-10">
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
              summary={summary}
              defaults={{
                fullName: user?.name ?? "",
                email: user?.email ?? "",
                phone: user?.phone ?? "",
                registrationId: user?.registrationId ?? "",
                patronType: user?.patronType ?? null,
              }}
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
              <div className="flex flex-col items-start gap-6">
                <Alert variant="warning" title="Exemplar indisponível no momento">
                  {availability.hasPhysicalCopies
                    ? "Todos os exemplares desta obra estão reservados ou em consulta. Tente novamente em alguns dias."
                    : "Esta obra ainda não possui exemplar físico cadastrado para reserva."}
                </Alert>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/acervo/${book.slug}`}>
                      <ArrowLeft aria-hidden="true" />
                      Voltar para a obra
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/acervo?availability=fisico">Ver obras disponíveis</Link>
                  </Button>
                </div>
              </div>
              <div>{summary}</div>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
