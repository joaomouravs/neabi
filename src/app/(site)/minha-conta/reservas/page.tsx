import { Calendar } from "lucide-react";
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
  const { active, history } = await listUserReservations(actor.id);

  return (
    <section aria-labelledby="reservas-titulo">
      <h2 id="reservas-titulo" className="font-display text-[1.875rem] font-bold leading-tight text-ink-900">
        Reservas em andamento
      </h2>
      <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
        Solicitações aguardando análise, aprovadas, prontas para retirada ou em consulta.
      </p>

      <div className="mt-7">
        {active.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhuma reserva em andamento"
            description={
              history.length > 0
                ? "Suas reservas anteriores estão no histórico. Quando você solicitar outra obra, ela aparecerá aqui."
                : "Você ainda não possui reservas. Quando solicitar a consulta de uma obra, ela aparecerá aqui com o protocolo e a situação atualizada."
            }
            action={
              <Button asChild size="lg">
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
