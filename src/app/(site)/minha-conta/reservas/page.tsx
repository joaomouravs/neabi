import type { Metadata } from "next";
import Link from "next/link";

import { ReservationList } from "@/components/reservations/reservation-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { requireActor } from "@/server/auth/session";
import { listUserReservations } from "@/server/repositories/reservation-repository";

export const metadata: Metadata = {
  title: "Minhas reservas",
  robots: { index: false, follow: false },
};

export default async function MyReservationsPage() {
  const actor = await requireActor();
  const { active } = await listUserReservations(actor.id);

  return (
    <section aria-labelledby="reservas-titulo">
      <h2
        id="reservas-titulo"
        className="font-display text-2xl font-semibold text-ink-900"
      >
        Reservas em andamento
      </h2>
      <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
        Solicitações aguardando análise, aprovadas, prontas para retirada ou em
        consulta.
      </p>

      <div className="mt-8">
        {active.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva em andamento"
            description="Quando você solicitar a consulta de uma obra, ela aparecerá aqui com o número de protocolo e a situação atualizada."
            action={
              <Button asChild>
                <Link href="/acervo">Explorar o acervo</Link>
              </Button>
            }
          />
        ) : (
          <ReservationList reservations={active} />
        )}
      </div>
    </section>
  );
}
