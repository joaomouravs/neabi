"use client";

import { Download, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { deleteAccountAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, FieldLabel, PasswordInput } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

/**
 * Download dos dados.
 *
 * Um `<a>` comum, não o `Link` do projeto: é um arquivo, não uma página, e não
 * pode ser pré-carregado — cada download consulta o banco.
 */
export function DownloadDataButton() {
  return (
    <Button asChild variant="outline">
      <a href="/api/minha-conta/dados" download>
        <Download aria-hidden="true" />
        Baixar meus dados
      </a>
    </Button>
  );
}

/**
 * Exclusão da conta em dois passos: o botão só revela o formulário, que pede a
 * senha e uma confirmação explícita. Nada é apagado no primeiro clique.
 */
export function DeleteAccountForm({
  hasPassword,
  activeReservations,
}: {
  hasPassword: boolean;
  activeReservations: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<State, FormData>(deleteAccountAction, null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) passwordRef.current?.focus();
  }, [open]);

  if (!hasPassword) {
    return (
      <p className="text-[0.9375rem] leading-relaxed text-ink-700">
        Esta conta não usa senha. Para excluí-la, escreva para a equipe pelo
        formulário de contato.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" />
        Excluir minha conta
      </Button>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Alert variant="warning" title="Esta ação não pode ser desfeita">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Nome, e-mail, telefone, vínculo e matrícula são apagados da conta e das reservas.</li>
          {activeReservations > 0 ? (
            <li>
              {activeReservations === 1
                ? "A sua reserva em andamento será cancelada."
                : `As suas ${activeReservations} reservas em andamento serão canceladas.`}
            </li>
          ) : null}
          <li>As mensagens que você enviou pelo formulário de contato são apagadas.</li>
          <li>
            Fica apenas o registro anônimo de que uma obra foi reservada em tal data, usado
            nas estatísticas do acervo.
          </li>
        </ul>
      </Alert>

      {state && !state.ok && !state.field ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={fieldError(state, "password")}>
        <FieldLabel required>Confirme com a sua senha</FieldLabel>
        <PasswordInput
          ref={passwordRef}
          name="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <CheckboxField
        name="confirmation"
        label="Entendo que a conta e os meus dados pessoais serão apagados definitivamente."
        error={fieldError(state, "confirmation")}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Excluindo…" : "Excluir definitivamente"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Manter a conta
        </Button>
      </div>
    </form>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
