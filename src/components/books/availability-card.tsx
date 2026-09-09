import Link from "next/link";

import { Button } from "@/components/ui/button";
import { copyStatusLabels } from "@/config/catalog";
import type { CopyStatus } from "@/generated/prisma/enums";
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
export function AvailabilityCard({
  slug,
  availability,
  copies,
  isAuthenticated,
}: {
  slug: string;
  availability: Availability;
  copies: { id: string; code: string; status: CopyStatus }[];
  isAuthenticated: boolean;
}) {
  const reserveHref = isAuthenticated
    ? `/acervo/${slug}/reservar`
    : `/login?callbackUrl=${encodeURIComponent(`/acervo/${slug}/reservar`)}`;

  return (
    <section
      aria-labelledby="disponibilidade-titulo"
      className="border border-border-strong bg-surface"
    >
      <div aria-hidden="true" className="neabi-rule h-1 w-full" />

      <div className="p-5 sm:p-6">
        <h2
          id="disponibilidade-titulo"
          className="font-display text-xl font-semibold text-ink-900"
        >
          Disponibilidade
        </h2>

        <ul className="mt-4 flex flex-col gap-3">
          <li className="flex items-start gap-2.5">
            <StatusIcon ok={availability.physicalAvailable} />
            <div>
              <p className="text-[0.9375rem] font-medium leading-snug text-ink-900">
                {physicalAvailabilityLabel(availability)}
              </p>
              {availability.hasPhysicalCopies ? (
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-500">
                  {availability.totalCopies}{" "}
                  {availability.totalCopies === 1
                    ? "exemplar cadastrado"
                    : "exemplares cadastrados"}
                  {availability.committedCopies > 0
                    ? ` · ${availability.committedCopies} em uso ou reservado`
                    : ""}
                </p>
              ) : null}
            </div>
          </li>

          <li className="flex items-start gap-2.5">
            <StatusIcon ok={availability.digitalAvailable} />
            <div>
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
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-2.5">
          {availability.physicalAvailable ? (
            <Button asChild size="lg" className="w-full">
              <Link href={reserveHref}>Reservar presencialmente</Link>
            </Button>
          ) : (
            // O rótulo precisa caber na coluna lateral (270px no desktop): o
            // botão não quebra linha, e um texto mais longo vazaria por cima
            // das bordas. A ressalva "no momento" já está na lista acima.
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
            É necessário entrar na sua conta para solicitar uma reserva.
          </p>
        ) : null}

        <p className="mt-4 border-t border-border pt-4 text-[0.8125rem] leading-relaxed text-ink-500">
          A reserva é um agendamento de consulta ou retirada presencial no espaço
          do NEABI, conforme as normas do núcleo.
        </p>

        {copies.length > 0 ? (
          <details className="mt-4 border-t border-border pt-4">
            <summary className="cursor-pointer font-sans text-[0.8125rem] font-semibold text-ink-700">
              Exemplares no acervo
            </summary>
            <ul className="mt-3 flex flex-col gap-1.5">
              {copies.map((copy) => (
                <li
                  key={copy.id}
                  className="flex items-center justify-between gap-3 text-[0.8125rem]"
                >
                  <span className="font-mono text-ink-600">{copy.code}</span>
                  <span className="text-ink-500">
                    {copyStatusLabels[copy.status]}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}

/** Ícone de estado. Decorativo: o texto ao lado carrega o significado. */
function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <span aria-hidden="true" className="mt-0.5 shrink-0">
      {ok ? (
        <svg
          width="17"
          height="17"
          viewBox="0 0 18 18"
          fill="none"
          stroke="var(--neabi-green)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9.5l4 4L15 5" />
        </svg>
      ) : (
        <svg
          width="17"
          height="17"
          viewBox="0 0 18 18"
          fill="none"
          stroke="var(--neabi-ink-400)"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M4 9h10" />
        </svg>
      )}
    </span>
  );
}
