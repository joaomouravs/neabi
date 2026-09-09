"use client";

import { useActionState, useState } from "react";

import { cancelReservationAction } from "@/features/reservations/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

/**
 * Cancelamento pela pessoa solicitante.
 *
 * Exige uma confirmação explícita antes de enviar — cancelar libera o exemplar
 * e não pode ser desfeito. Não usamos `window.confirm`, que é inacessível e
 * bloqueia a página.
 */
export function CancelReservationForm({
  reservationId,
}: {
  reservationId: string;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    cancelReservationAction,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  if (state?.ok) {
    return <Alert variant="info">Reserva cancelada.</Alert>;
  }

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Cancelar reserva
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="reservationId" value={reservationId} />

      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field description="Opcional. Ajuda a equipe do NEABI a entender a demanda.">
        <FieldLabel>Motivo do cancelamento</FieldLabel>
        <Textarea name="reason" rows={3} maxLength={300} />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Cancelando…" : "Confirmar cancelamento"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Manter reserva
        </Button>
      </div>
    </form>
  );
}
