import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ReservationList } from "@/components/reservations/reservation-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { requireActor } from "@/server/auth/session";
import { listUserReservations } from "@/server/repositories/reservation-repository";

export const metadata: Metadata = {
  title: "Histórico de reservas",
  robots: { index: false, follow: false },
};

export default async function ReservationHistoryPage() {
  const actor = await requireActor();
  const { history } = await listUserReservations(actor.id);

  return (
    <section aria-labelledby="historico-titulo">
      <h2 id="historico-titulo" className="font-display text-[1.875rem] font-bold leading-tight text-ink-900">
        Histórico
      </h2>
      <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
        Reservas concluídas, recusadas, canceladas ou expiradas.
      </p>

      <div className="mt-7">
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhum registro no histórico"
            description="Reservas finalizadas aparecerão aqui, com protocolo e a última situação registrada."
            action={
              <Button asChild variant="outline" size="lg">
                <Link href="/minha-conta/reservas">Ver reservas em andamento</Link>
              </Button>
            }
          />
        ) : (
          <ReservationList reservations={history} />
        )}
      </div>
    </section>
  );
}
