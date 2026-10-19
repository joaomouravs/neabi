"use client";

import { useActionState } from "react";

import { MetadataList } from "@/components/layout/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { sendTestEmailAction } from "@/features/settings/actions";
import type { ActionResult } from "@/server/errors";

export interface EmailStatus {
  enabled: boolean;
  from: string;
  host: string | null;
  hasCredentials: boolean;
}

/**
 * Estado do envio de e-mail e o teste de ponta a ponta.
 *
 * A configuração vive em variáveis de ambiente, não no banco: o painel mostra
 * o que está valendo e permite conferir se uma mensagem de fato sai — sem
 * nunca exibir a credencial.
 */
export function EmailSettings({ status }: { status: EmailStatus }) {
  const [state, action, pending] = useActionState<
    ActionResult<{ to: string }> | null,
    FormData
  >(() => sendTestEmailAction(), null);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Badge variant={status.enabled ? "green" : "neutral"} size="sm">
          {status.enabled ? "Envio ligado" : "Envio desligado"}
        </Badge>
        <p className="mt-2 max-w-prose text-[0.875rem] leading-relaxed text-ink-600">
          {status.enabled
            ? "As notificações de reserva (recebida, aprovada, recusada, pronta para retirada, cancelada, expirada) saem por e-mail para quem fez a solicitação."
            : "As notificações de reserva só aparecem em Minhas reservas; nenhum e-mail sai. Para ligar, defina MAIL_DRIVER=\"smtp\" e o servidor SMTP nas variáveis de ambiente."}
        </p>
      </div>

      <MetadataList
        items={[
          { label: "Remetente", value: status.enabled ? status.from : null },
          { label: "Servidor SMTP", value: status.host },
          {
            label: "Credencial",
            value: status.host ? (status.hasCredentials ? "Configurada" : "Ausente") : null,
          },
        ]}
      />

      {status.enabled ? (
        <form action={action} className="flex flex-col items-start gap-3">
          {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}
          {state?.ok ? (
            <Alert variant="success">
              Mensagem de teste enviada para {state.data.to}. Confira a caixa de entrada — e
              a de spam.
            </Alert>
          ) : null}
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? "Enviando…" : "Enviar e-mail de teste para a minha conta"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
