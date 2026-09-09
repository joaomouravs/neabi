"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { sendContactMessageAction } from "@/features/contact/actions";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

export function ContactForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    sendContactMessageAction,
    null,
  );

  /**
   * Instante em que o formulário ficou disponível — envios instantâneos são
   * quase sempre automatizados.
   *
   * O valor é escrito no DOM por um efeito, e não calculado durante a
   * renderização: `Date.now()` é impuro e não pode ser chamado no corpo do
   * componente.
   */
  const renderedAtField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renderedAtField.current) {
      renderedAtField.current.value = String(Date.now());
    }
  }, []);

  if (state?.ok) {
    return (
      <Alert variant="success" title="Mensagem enviada">
        Sua mensagem foi recebida pela equipe do NEABI. O retorno é feito pelo
        e-mail informado.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="renderedAt" ref={renderedAtField} defaultValue="" />

      {/* Campo-armadilha: invisível para pessoas, ignorado por leitores de tela. */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state && !state.ok && !state.field ? (
        <Alert variant="danger">{state.error}</Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "name")}>
          <FieldLabel required>Nome</FieldLabel>
          <Input name="name" autoComplete="name" required maxLength={160} />
        </Field>

        <Field error={fieldError(state, "email")}>
          <FieldLabel required>E-mail</FieldLabel>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
      </div>

      <Field error={fieldError(state, "subject")}>
        <FieldLabel required>Assunto</FieldLabel>
        <Input name="subject" required maxLength={200} />
      </Field>

      <Field error={fieldError(state, "message")}>
        <FieldLabel required>Mensagem</FieldLabel>
        <Textarea name="message" rows={7} required minLength={10} maxLength={4000} />
      </Field>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Enviando…" : "Enviar mensagem"}
        </Button>
      </div>
    </form>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
