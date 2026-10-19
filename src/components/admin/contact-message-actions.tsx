"use client";

import { Mail } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import {
  deleteContactMessageAction,
  markContactMessageReadAction,
  setContactStatusAction,
} from "@/features/contact/actions";
import { ContactStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

/**
 * As transições oferecidas a partir de cada situação. Qualquer uma é válida
 * para o servidor; aqui só se escolhe o que faz sentido mostrar.
 */
const TRANSITIONS: Record<
  ContactStatus,
  { status: ContactStatus; label: string; variant: "success" | "ghost" | "outline" }[]
> = {
  NEW: [
    { status: ContactStatus.ANSWERED, label: "Marcar como respondida", variant: "success" },
    { status: ContactStatus.READ, label: "Marcar como lida", variant: "outline" },
    { status: ContactStatus.ARCHIVED, label: "Arquivar", variant: "ghost" },
  ],
  READ: [
    { status: ContactStatus.ANSWERED, label: "Marcar como respondida", variant: "success" },
    { status: ContactStatus.NEW, label: "Marcar como não lida", variant: "outline" },
    { status: ContactStatus.ARCHIVED, label: "Arquivar", variant: "ghost" },
  ],
  ANSWERED: [
    { status: ContactStatus.READ, label: "Reabrir", variant: "outline" },
    { status: ContactStatus.ARCHIVED, label: "Arquivar", variant: "ghost" },
  ],
  ARCHIVED: [{ status: ContactStatus.READ, label: "Desarquivar", variant: "outline" }],
};

/**
 * Ações sobre uma mensagem de contato.
 *
 * Responder acontece fora do sistema, no e-mail de quem atende — o link já
 * abre a resposta com o assunto preenchido. Registrar "respondida" é um passo
 * separado e explícito: abrir o programa de e-mail não garante que a resposta
 * foi enviada.
 */
export function ContactMessageActions({
  messageId,
  status,
  replyHref,
  canManage,
  canDelete,
}: {
  messageId: string;
  status: ContactStatus;
  replyHref: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    setContactStatusAction,
    null,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <a href={replyHref}>
            <Mail aria-hidden="true" />
            Responder por e-mail
          </a>
        </Button>

        {canManage
          ? TRANSITIONS[status].map((transition) => (
              <form key={transition.status} action={action}>
                <input type="hidden" name="messageId" value={messageId} />
                <input type="hidden" name="status" value={transition.status} />
                <Button type="submit" variant={transition.variant} disabled={pending}>
                  {transition.label}
                </Button>
              </form>
            ))
          : null}
      </div>

      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      {canDelete ? <DeleteMessageButton messageId={messageId} /> : null}
    </div>
  );
}

/** A navegação após a exclusão é feita pela própria Server Action. */
function DeleteMessageButton({ messageId }: { messageId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<State, FormData>(
    deleteContactMessageAction,
    null,
  );

  return (
    <div className="border-t border-border pt-4">
      {!confirming ? (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          Excluir mensagem
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="messageId" value={messageId} />
          <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-700">
            A exclusão é definitiva e apaga nome, e-mail e texto da mensagem. Use-a
            para atender a um pedido de eliminação de dados; para tirar a mensagem
            da fila, prefira arquivar.
          </p>
          {state && !state.ok ? (
            <p className="text-[0.75rem] text-neabi-red-700">{state.error}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
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
      )}
    </div>
  );
}

/**
 * Marca a mensagem como lida depois que a página foi exibida. Ver
 * `markContactMessageReadAction` para o motivo de não fazê-lo no servidor.
 */
export function MarkContactMessageRead({ messageId }: { messageId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void markContactMessageReadAction(messageId);
  }, [messageId]);

  return null;
}
