"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { copyStatusLabels } from "@/config/catalog";
import { manageReservationAction } from "@/features/reservations/actions";
import type { CopyStatus, ReservationStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";
import { availableActions } from "@/server/services/reservation-rules";
import type { ReservationAction } from "@/validators/reservation";

type State = ActionResult<undefined> | null;

const ACTION_LABELS: Record<ReservationAction, string> = {
  approve: "Aprovar",
  reject: "Recusar",
  ready: "Preparar para retirada",
  pickup: "Marcar como retirado",
  return: "Registrar devolução",
  cancel: "Cancelar",
  expire: "Marcar como expirada",
};

const ACTION_VARIANTS: Record<
  ReservationAction,
  "success" | "danger" | "primary" | "outline" | "ghost"
> = {
  approve: "success",
  reject: "danger",
  ready: "primary",
  pickup: "primary",
  return: "success",
  cancel: "ghost",
  expire: "ghost",
};

const ACTION_HINTS: Partial<Record<ReservationAction, string>> = {
  approve:
    "Aprovar reserva um exemplar para esta pessoa e o retira do acervo disponível.",
  ready:
    "Avisa a pessoa que o exemplar está separado e inicia a contagem do prazo de retirada.",
  return: "Devolve o exemplar ao acervo e encerra a reserva.",
  cancel: "Libera o exemplar imediatamente.",
};

/**
 * Ações administrativas da reserva.
 *
 * As opções vêm da máquina de estados do domínio (`availableActions`), então a
 * interface nunca oferece uma transição que o servidor recusaria — e o servidor
 * valida de novo, de qualquer forma.
 */
export function ReservationActions({
  reservationId,
  status,
  copies,
  currentCopyId,
  emailEnabled,
}: {
  reservationId: string;
  status: ReservationStatus;
  copies: { id: string; code: string; status: CopyStatus }[];
  currentCopyId: string | null;
  /** Sem envio de e-mail configurado, a pessoa só vê a observação na conta. */
  emailEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    manageReservationAction,
    null,
  );
  const [selected, setSelected] = useState<ReservationAction | null>(null);

  const actions = availableActions(status);

  // Aplicada a transição, o status muda e a ação escolhida deixa de existir.
  // Derivar o painel aberto a partir das ações válidas fecha-o sozinho: sem
  // isso a interface continuaria oferecendo "Confirmar: Aprovar" em uma reserva
  // já aprovada — uma transição que o servidor recusaria.
  const openAction = selected && actions.includes(selected) ? selected : null;

  if (actions.length === 0) {
    return (
      <p className="text-[0.875rem] text-ink-500">
        Esta reserva está encerrada e não admite novas transições.
      </p>
    );
  }

  const availableCopies = copies.filter(
    (copy) => copy.status === "AVAILABLE" || copy.id === currentCopyId,
  );

  return (
    <div className="flex flex-col gap-4">
      {state && !state.ok ? (
        <Alert variant="danger" title="Não foi possível concluir">
          {state.error}
        </Alert>
      ) : null}
      {state?.ok ? <Alert variant="success">Reserva atualizada.</Alert> : null}

      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <Button
            key={item}
            variant={openAction === item ? "dark" : ACTION_VARIANTS[item]}
            size="sm"
            onClick={() => setSelected(openAction === item ? null : item)}
            aria-expanded={openAction === item}
          >
            {ACTION_LABELS[item]}
          </Button>
        ))}
      </div>

      {openAction ? (
        <form
          key={openAction}
          action={action}
          className="flex flex-col gap-4 border border-border bg-surface-muted p-4"
        >
          <input type="hidden" name="reservationId" value={reservationId} />
          <input type="hidden" name="action" value={openAction} />

          <p className="font-sans text-[0.875rem] font-semibold text-ink-900">
            {ACTION_LABELS[openAction]}
          </p>
          {ACTION_HINTS[openAction] ? (
            <p className="-mt-2 text-[0.8125rem] leading-relaxed text-ink-600">
              {ACTION_HINTS[openAction]}
            </p>
          ) : null}

          {openAction === "approve" ? (
            <Field
              description={
                availableCopies.length === 0
                  ? "Nenhum exemplar livre no momento. A aprovação será recusada."
                  : "Vazio designa automaticamente o primeiro exemplar disponível."
              }
            >
              <FieldLabel>Exemplar designado</FieldLabel>
              <Select name="copyId" defaultValue={currentCopyId ?? ""}>
                <option value="">Escolher automaticamente</option>
                {availableCopies.map((copy) => (
                  <option key={copy.id} value={copy.id}>
                    {copy.code} — {copyStatusLabels[copy.status]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field
            description={
              openAction === "reject"
                ? emailEnabled
                  ? "A observação é enviada por e-mail à pessoa solicitante."
                  : "A pessoa solicitante vê a observação em Minhas reservas. O envio de e-mail não está configurado."
                : "Registrada no histórico da reserva."
            }
          >
            <FieldLabel required={openAction === "reject"}>
              Observação
            </FieldLabel>
            <Textarea
              name="note"
              rows={3}
              maxLength={500}
              required={openAction === "reject"}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={pending}>
              {pending ? "Aplicando…" : `Confirmar: ${ACTION_LABELS[openAction]}`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
