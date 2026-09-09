"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { loginAction, registerAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { patronTypeLabels } from "@/config/catalog";
import { PatronType } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";

type AuthState = ActionResult<{ redirectTo: string }> | null;

/**
 * Formulários de entrada e cadastro.
 *
 * Usam `useActionState`, então funcionam antes da hidratação: o navegador envia
 * o formulário normalmente e a Server Action responde. O JavaScript apenas
 * melhora a experiência (estado de envio, foco no erro).
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Entrar ou criar conta"
        className="mb-8 flex border-b border-border"
      >
        {(
          [
            ["login", "Entrar"],
            ["register", "Criar conta"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            id={`aba-${value}`}
            aria-selected={mode === value}
            aria-controls={`painel-${value}`}
            onClick={() => setMode(value)}
            className={
              mode === value
                ? "-mb-px border-b-2 border-neabi-red px-4 py-3 font-sans text-[0.9375rem] font-semibold text-ink-900"
                : "-mb-px border-b-2 border-transparent px-4 py-3 font-sans text-[0.9375rem] font-medium text-ink-500 hover:text-ink-800"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <div role="tabpanel" id="painel-login" aria-labelledby="aba-login">
          <SignInFields callbackUrl={callbackUrl} onSuccess={router.push} />
        </div>
      ) : (
        <div role="tabpanel" id="painel-register" aria-labelledby="aba-register">
          <SignUpFields callbackUrl={callbackUrl} onSuccess={router.push} />
        </div>
      )}
    </div>
  );
}

function SignInFields({
  callbackUrl,
  onSuccess,
}: {
  callbackUrl: string;
  onSuccess: (url: string) => void;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    loginAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) onSuccess(state.data.redirectTo);
  }, [state, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={fieldError(state, "email")}>
        <FieldLabel required>E-mail</FieldLabel>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.org"
        />
      </Field>

      <Field error={fieldError(state, "password")}>
        <FieldLabel required>Senha</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpFields({
  callbackUrl,
  onSuccess,
}: {
  callbackUrl: string;
  onSuccess: (url: string) => void;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    registerAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) onSuccess(state.data.redirectTo);
  }, [state, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={fieldError(state, "name")}>
        <FieldLabel required>Nome completo</FieldLabel>
        <Input name="name" autoComplete="name" required />
      </Field>

      <Field error={fieldError(state, "email")}>
        <FieldLabel required>E-mail</FieldLabel>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>

      <Field
        error={fieldError(state, "password")}
        description="Pelo menos 10 caracteres."
      >
        <FieldLabel required>Senha</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
      </Field>

      <Field error={fieldError(state, "passwordConfirmation")}>
        <FieldLabel required>Confirmar senha</FieldLabel>
        <Input
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field error={fieldError(state, "patronType")}>
        <FieldLabel>Vínculo</FieldLabel>
        <Select name="patronType" defaultValue="">
          <option value="">Prefiro informar depois</option>
          {Object.values(PatronType).map((type) => (
            <option key={type} value={type}>
              {patronTypeLabels[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        error={fieldError(state, "registrationId")}
        description="Se você tem vínculo com o CEFET/RJ, informe a matrícula ou SIAPE."
      >
        <FieldLabel>Matrícula ou vínculo institucional</FieldLabel>
        <Input name="registrationId" />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>

      <p className="text-[0.8125rem] leading-relaxed text-ink-500">
        Ao criar uma conta você poderá solicitar reservas e acompanhar seus
        pedidos. Consultar o acervo não exige cadastro —{" "}
        <Link
          href="/acervo"
          className="underline underline-offset-4 hover:text-ink-800"
        >
          explore o acervo livremente
        </Link>
        .
      </p>
    </form>
  );
}

function fieldError(state: AuthState, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
