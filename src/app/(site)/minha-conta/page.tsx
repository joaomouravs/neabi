import { ArrowRight, Calendar, CircleCheck, Clock, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ReservationList } from "@/components/reservations/reservation-list";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { formatLongDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/auth/session";
import { listUserReservations } from "@/server/repositories/reservation-repository";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const actor = await requireActor();

  const [{ active, history }, user] = await Promise.all([
    listUserReservations(actor.id),
    prisma.user.findUnique({
      where: { id: actor.id },
      select: { phone: true, patronType: true },
    }),
  ]);

  const pending = active.filter((reservation) => reservation.status === "PENDING");
  const ongoing = active.filter((reservation) => reservation.status !== "PENDING");
  const readyForPickup = active.filter((reservation) => reservation.status === "READY_FOR_PICKUP");
  const profileIncomplete = !user?.phone || !user?.patronType;

  const stats = [
    {
      href: "/minha-conta/reservas",
      label: "Reservas ativas",
      value: ongoing.length,
      hint: "Aprovadas, prontas para retirada ou em consulta",
      icon: CircleCheck,
      accent: "border-t-neabi-green",
    },
    {
      href: "/minha-conta/reservas",
      label: "Aguardando confirmação",
      value: pending.length,
      hint: "Em análise pela equipe do NEABI",
      icon: Clock,
      accent: "border-t-neabi-amber",
    },
    {
      href: "/minha-conta/historico",
      label: "Histórico",
      value: history.length,
      hint: "Concluídas, recusadas, canceladas ou expiradas",
      icon: History,
      accent: "border-t-ink-300",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="sr-only">
          Resumo das reservas
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {stats.map(({ href, label, value, hint, icon: Icon, accent }) => (
            <li key={label}>
              <Link
                href={href}
                className={cn(
                  "group flex h-full flex-col border border-t-2 border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:shadow-card",
                  accent,
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[0.8125rem] font-semibold text-ink-700">{label}</span>
                  <Icon aria-hidden="true" className="size-4 text-ink-400" />
                </span>
                <span className="mt-4 font-display text-[3rem] font-bold leading-none tabular-nums text-ink-900">
                  {value}
                </span>
                <span className="mt-2 text-[0.8125rem] leading-snug text-ink-500">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {readyForPickup.length > 0 ? (
        <Alert variant="success" title="Exemplar separado para você">
          <ul className="mt-1 flex flex-col gap-1">
            {readyForPickup.map((reservation) => (
              <li key={reservation.id}>
                <Link
                  href={`/minha-conta/reservas/${reservation.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  {reservation.book.title}
                </Link>{" "}
                — compareça ao NEABI no dia {formatLongDate(reservation.requestedDate)}.
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <section aria-labelledby="andamento-titulo">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="andamento-titulo" className="font-display text-[1.875rem] font-bold leading-tight text-ink-900">
              Minhas reservas
            </h2>
            <p className="mt-1 text-[0.9375rem] text-ink-600">Solicitações em andamento, das mais recentes.</p>
          </div>
          {active.length > 3 ? (
            <Link
              href="/minha-conta/reservas"
              className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink-900"
            >
              <span className="link-underline">Ver todas ({active.length})</span>
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>

        <div className="mt-6">
          {active.length > 0 ? (
            <ReservationList reservations={active.slice(0, 3)} />
          ) : (
            <EmptyState
              icon={Calendar}
              title={history.length > 0 ? "Nenhuma reserva em andamento" : "Você ainda não possui reservas"}
              description={
                history.length > 0
                  ? "Suas reservas anteriores estão no histórico. Encontre outra obra para consultar."
                  : "Encontre uma obra no acervo e solicite a consulta presencial — ela aparece aqui com protocolo e status atualizado."
              }
              action={
                <>
                  <Button asChild size="lg">
                    <Link href="/acervo">Explorar o acervo</Link>
                  </Button>
                  {history.length > 0 ? (
                    <Button asChild variant="outline" size="lg">
                      <Link href="/minha-conta/historico">Ver histórico</Link>
                    </Button>
                  ) : null}
                </>
              }
            />
          )}
        </div>
      </section>

      {profileIncomplete ? (
        <section
          aria-labelledby="perfil-incompleto"
          className="flex flex-col gap-4 border border-border bg-surface-muted p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <h2 id="perfil-incompleto" className="font-display text-xl font-bold text-ink-900">
              Complete seu perfil
            </h2>
            <p className="mt-1 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
              Telefone e vínculo preenchem automaticamente o formulário de reserva.
            </p>
          </div>
          <Button asChild variant="dark" className="self-start sm:self-auto">
            <Link href="/minha-conta/perfil">Atualizar perfil</Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
