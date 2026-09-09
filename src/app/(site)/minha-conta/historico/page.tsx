import type { Metadata } from "next";

import { ReservationList } from "@/components/reservations/reservation-list";
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
      <h2
        id="historico-titulo"
        className="font-display text-2xl font-semibold text-ink-900"
      >
        Histórico
      </h2>
      <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
        Reservas concluídas, recusadas, canceladas ou expiradas.
      </p>

      <div className="mt-8">
        {history.length === 0 ? (
          <EmptyState
            title="Nenhum registro no histórico"
            description="Reservas finalizadas aparecerão aqui."
          />
        ) : (
          <ReservationList reservations={history} />
        )}
      </div>
    </section>
  );
}
