"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { deleteBookAction, setBookStatusAction } from "@/features/books/actions";
import { BookStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

/**
 * Publicar, despublicar, arquivar e excluir.
 *
 * A exclusão exige confirmação explícita e é recusada pelo servidor quando a
 * obra tem histórico de reservas — o registro de atendimento do NEABI não pode
 * desaparecer junto com o catálogo.
 */
export function BookStatusActions({
  bookId,
  status,
  canDelete,
}: {
  bookId: string;
  status: BookStatus;
  canDelete: boolean;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    setBookStatusAction,
    null,
  );

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        {status !== BookStatus.PUBLISHED ? (
          <form action={action}>
            <input type="hidden" name="id" value={bookId} />
            <input type="hidden" name="status" value={BookStatus.PUBLISHED} />
            <Button type="submit" variant="success" size="sm" disabled={pending}>
              Publicar
            </Button>
          </form>
        ) : (
          <form action={action}>
            <input type="hidden" name="id" value={bookId} />
            <input type="hidden" name="status" value={BookStatus.DRAFT} />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              Despublicar
            </Button>
          </form>
        )}

        {status !== BookStatus.ARCHIVED ? (
          <form action={action}>
            <input type="hidden" name="id" value={bookId} />
            <input type="hidden" name="status" value={BookStatus.ARCHIVED} />
            <Button type="submit" variant="ghost" size="sm" disabled={pending}>
              Arquivar
            </Button>
          </form>
        ) : null}

        {canDelete ? <DeleteBookButton bookId={bookId} /> : null}
      </div>
    </div>
  );
}

/** A navegação após a exclusão é feita pela própria Server Action. */
function DeleteBookButton({ bookId }: { bookId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<State, FormData>(
    deleteBookAction,
    null,
  );

  if (!confirming) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Excluir
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={bookId} />
      {state && !state.ok ? (
        <p className="max-w-xs text-right text-[0.75rem] text-neabi-red-700">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Excluindo…" : "Confirmar exclusão"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
