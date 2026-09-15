import { BookOpen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { copyStatusLabels } from "@/config/catalog";
import type { CopyStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import {
  digitalAvailabilityLabel,
  physicalAvailabilityLabel,
  type Availability,
} from "@/server/services/availability";

/**
 * Painel de disponibilidade da obra.
 *
 * Regras que este componente materializa:
 *  - a disponibilidade física vem da contagem de exemplares, nunca de um
 *    booleano no livro;
 *  - o botão "Ler online" só existe quando há arquivo digital **autorizado**
 *    cadastrado — a mera existência de um PDF não libera consulta;
 *  - "Reservar presencialmente" só aparece quando há exemplar livre.
 */

const RESERVATION_STEPS = [
  "Escolha a data e o turno e envie a solicitação.",
  "A equipe do NEABI analisa o pedido — acompanhe em Minhas reservas.",
  "Com a reserva aprovada, consulte ou retire o exemplar no núcleo.",
];

export function AvailabilityCard({
  slug,
  availability,
  copies,
  isAuthenticated,
  reserveCtaId,
}: {
  slug: string;
  availability: Availability;
  copies: { id: string; code: string; status: CopyStatus }[];
  isAuthenticated: boolean;
  /** `id` do botão principal — a barra fixa do celular observa a visibilidade dele. */
  reserveCtaId?: string;
}) {
  const reserveHref = isAuthenticated
    ? `/acervo/${slug}/reservar`
    : `/login?callbackUrl=${encodeURIComponent(`/acervo/${slug}/reservar`)}`;

  const physicalTone = availability.physicalAvailable
    ? "bg-neabi-green"
    : availability.hasPhysicalCopies
      ? "bg-neabi-amber"
      : "bg-ink-300";

  return (
    <section
      aria-labelledby="disponibilidade-titulo"
      className="relative overflow-hidden border border-border-strong bg-surface shadow-card"
    >
      <div aria-hidden="true" className="neabi-rule h-1 w-full" />

      <div className="p-5 sm:p-6">
        <h2
          id="disponibilidade-titulo"
          className="font-display text-2xl font-bold text-ink-900"
        >
          Disponibilidade
        </h2>

        <div className="mt-5 flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn("mt-2 size-2.5 shrink-0 rounded-full", physicalTone)}
          />
          <div className="min-w-0">
            <p className="font-display text-[1.375rem] font-semibold leading-tight text-ink-900">
              {physicalAvailabilityLabel(availability)}
            </p>
            {availability.hasPhysicalCopies ? (
              <p className="mt-1 text-[0.875rem] leading-snug text-ink-600">
                {availability.totalCopies}{" "}
                {availability.totalCopies === 1 ? "exemplar físico" : "exemplares físicos"} no
                acervo
                {availability.committedCopies > 0
                  ? ` · ${availability.committedCopies} em uso ou reservado`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 border-t border-border pt-4">
          <BookOpen
            aria-hidden="true"
            className={cn(
              "mt-0.5 size-4 shrink-0",
              availability.digitalAvailable ? "text-neabi-green" : "text-ink-400",
            )}
          />
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-medium leading-snug text-ink-900">
              {digitalAvailabilityLabel(availability)}
            </p>
            {!availability.digitalAvailable ? (
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-500">
                Esta obra integra o acervo físico. Nenhum arquivo digital
                autorizado foi cadastrado.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {availability.physicalAvailable ? (
            <Button asChild size="lg" className="w-full">
              <Link id={reserveCtaId} href={reserveHref}>
                Reservar presencialmente
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              {availability.hasPhysicalCopies
                ? "Exemplar indisponível"
                : "Sem exemplar para reserva"}
            </Button>
          )}

          {/* Só renderizado quando existe PDF autorizado. */}
          {availability.digitalAvailable ? (
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href={`/acervo/${slug}/ler`}>Ler online</Link>
            </Button>
          ) : null}
        </div>

        {!isAuthenticated && availability.physicalAvailable ? (
          <p className="mt-3 text-[0.8125rem] leading-snug text-ink-500">
            É preciso entrar na sua conta para solicitar a reserva. A consulta
            ao catálogo continua livre.
          </p>
        ) : null}

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="eyebrow tracking-[0.12em] text-ink-500">Como funciona a reserva</h3>
          <ol className="mt-3 flex flex-col gap-2.5">
            {RESERVATION_STEPS.map((step, index) => (
              <li
                key={step}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2 text-[0.8125rem] leading-snug text-ink-600"
              >
                <span aria-hidden="true" className="font-semibold tabular-nums text-neabi-red-600">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[0.75rem] leading-snug text-ink-500">
            Reserva é agendamento de consulta ou retirada presencial, conforme as
            normas do núcleo — não empréstimo domiciliar.
          </p>
        </div>

        {copies.length > 0 ? (
          <details className="group mt-5 border-t border-border pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-sans text-[0.8125rem] font-semibold text-ink-700 hover:text-ink-900 [&::-webkit-details-marker]:hidden">
              Exemplares no acervo
              <span
                aria-hidden="true"
                className="text-ink-500 transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <ul className="mt-3 flex flex-col gap-1.5">
              {copies.map((copy) => (
                <li
                  key={copy.id}
                  className="flex items-center justify-between gap-3 text-[0.8125rem]"
                >
                  <span className="truncate font-mono text-ink-600">{copy.code}</span>
                  <span className="shrink-0 text-ink-500">{copyStatusLabels[copy.status]}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
