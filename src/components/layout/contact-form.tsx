"use client";

import { CircleCheck } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { useFormValidation } from "@/components/ui/use-form-validation";
import { sendContactMessageAction } from "@/features/contact/actions";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

export const CONTACT_TOPICS = [
  "Acervo e consulta",
  "Reservas",
  "Doação de obras",
  "Parcerias e visitas",
  "Acessibilidade",
  "Outro assunto",
] as const;

const MESSAGE_MAX = 4000;

/**
 * Formulário de contato.
 *
 * A confirmação substitui o formulário — fica claro que a mensagem saiu — e
 * "Enviar outra mensagem" recria o formulário do zero.
 */
export function ContactForm() {
  const [round, setRound] = useState(0);
  return <ContactFormRound key={round} onReset={() => setRound((value) => value + 1)} />;
}

function ContactFormRound({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState<State, FormData>(sendContactMessageAction, null);
  const [messageLength, setMessageLength] = useState(0);
  const validation = useFormValidation({
    name: (value) => (value.trim() ? null : "Informe o nome."),
    email: (value) =>
      !value.trim()
        ? "Informe o e-mail."
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? null
          : "Informe um e-mail válido.",
    subject: (value) => (value ? null : "Escolha o assunto."),
    message: (value) =>
      value.trim().length >= 10 ? null : "A mensagem deve ter pelo menos 10 caracteres.",
  });

  /**
   * Instante em que o formulário ficou disponível — envios instantâneos são
   * quase sempre automatizados. Escrito no DOM por um efeito: `Date.now()` é
   * impuro e não pode ser chamado durante a renderização.
   */
  const renderedAtField = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (renderedAtField.current) renderedAtField.current.value = String(Date.now());
  }, []);

  // O foco acompanha a troca de conteúdo: quem usa leitor de tela ouve a
  // confirmação em vez de ficar perdido no lugar de um formulário que sumiu.
  useEffect(() => {
    if (state?.ok) successHeading.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-start py-4">
        <div aria-hidden="true" className="flex size-14 items-center justify-center bg-neabi-green text-white">
          <CircleCheck className="size-7" />
        </div>
        <h3
          ref={successHeading}
          tabIndex={-1}
          className="mt-6 font-display text-[2rem] font-bold leading-tight text-ink-900 focus:outline-none"
        >
          Mensagem enviada
        </h3>
        <p role="status" className="mt-3 max-w-md text-[1rem] leading-relaxed text-ink-600">
          Sua mensagem foi recebida pela equipe do NEABI. O retorno é feito pelo
          e-mail informado.
        </p>
        <Button variant="outline" className="mt-7" onClick={onReset}>
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  const messageProps = validation.fieldProps("message");

  return (
    <form action={action} noValidate onSubmit={validation.handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="renderedAt" ref={renderedAtField} defaultValue="" />

      {/* Campo-armadilha: invisível para pessoas, ignorado por leitores de tela. */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state && !state.ok && !state.field ? <Alert variant="danger">{state.error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={validation.errorFor("name", fieldError(state, "name"))}>
          <FieldLabel required>Nome</FieldLabel>
          <Input name="name" autoComplete="name" required maxLength={160} {...validation.fieldProps("name")} />
        </Field>

        <Field error={validation.errorFor("email", fieldError(state, "email"))}>
          <FieldLabel required>E-mail</FieldLabel>
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            {...validation.fieldProps("email")}
          />
        </Field>
      </div>

      <Field error={validation.errorFor("subject", fieldError(state, "subject"))}>
        <FieldLabel required>Assunto</FieldLabel>
        <Select name="subject" required defaultValue="" {...validation.fieldProps("subject")}>
          <option value="" disabled>
            Escolha um assunto…
          </option>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        error={validation.errorFor("message", fieldError(state, "message"))}
        description={`${messageLength} de ${MESSAGE_MAX} caracteres.`}
      >
        <FieldLabel required>Mensagem</FieldLabel>
        <Textarea
          name="message"
          rows={7}
          required
          minLength={10}
          maxLength={MESSAGE_MAX}
          {...messageProps}
          onChange={(event) => {
            setMessageLength(event.target.value.length);
            messageProps.onChange(event);
          }}
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:gap-5">
        <Button type="submit" size="lg" loading={pending}>
          {pending ? "Enviando…" : "Enviar mensagem"}
        </Button>
        <p className="text-[0.8125rem] leading-snug text-ink-500">
          Usamos seus dados só para responder a esta mensagem.
        </p>
      </div>
    </form>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
