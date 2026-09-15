"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { loginAction, registerAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, PasswordInput, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { useFormValidation } from "@/components/ui/use-form-validation";
import { patronTypeLabels } from "@/config/catalog";
import { PatronType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/errors";

type AuthState = ActionResult<{ redirectTo: string }> | null;
type Mode = "login" | "register";

const TABS: [Mode, string][] = [
  ["login", "Entrar"],
  ["register", "Criar conta"],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailRule = (value: string) =>
  !value.trim()
    ? "Informe o e-mail."
    : EMAIL_PATTERN.test(value.trim())
      ? null
      : "Informe um e-mail válido.";

/**
 * Formulários de entrada e cadastro.
 *
 * Usam `useActionState`, então funcionam antes da hidratação: o navegador envia
 * o formulário normalmente e a Server Action responde. O JavaScript melhora a
 * experiência — validação imediata, estado de envio, mostrar senha.
 *
 * As abas seguem o padrão ARIA: setas trocam de aba, e só a aba ativa entra
 * na ordem de tabulação.
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ login: null, register: null });

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next: Mode =
      event.key === "Home" ? "login" : event.key === "End" ? "register" : mode === "login" ? "register" : "login";
    setMode(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Entrar ou criar conta"
        className="grid grid-cols-2 border border-ink-900/15 bg-surface-muted p-1"
      >
        {TABS.map(([value, label]) => (
          <button
            key={value}
            ref={(element) => {
              tabRefs.current[value] = element;
            }}
            role="tab"
            type="button"
            id={`aba-${value}`}
            aria-selected={mode === value}
            aria-controls={`painel-${value}`}
            tabIndex={mode === value ? 0 : -1}
            onClick={() => setMode(value)}
            onKeyDown={handleTabKey}
            className={cn(
              "min-h-11 font-sans text-[0.9375rem] font-semibold transition-colors duration-150",
              mode === value
                ? "bg-surface text-ink-900 shadow-hairline ring-1 ring-ink-900/10"
                : "text-ink-600 hover:text-ink-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {mode === "login" ? (
          <div role="tabpanel" id="painel-login" aria-labelledby="aba-login">
            <SignInFields callbackUrl={callbackUrl} onSuccess={router.push} />
            <p className="mt-6 text-center text-[0.875rem] text-ink-600">
              Ainda não tem conta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  tabRefs.current.register?.focus();
                }}
                className="font-semibold text-ink-900 underline underline-offset-4 hover:text-neabi-red-700"
              >
                Crie em um minuto
              </button>
            </p>
          </div>
        ) : (
          <div role="tabpanel" id="painel-register" aria-labelledby="aba-register">
            <SignUpFields callbackUrl={callbackUrl} onSuccess={router.push} />
          </div>
        )}
      </div>
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
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);
  const validation = useFormValidation({
    email: emailRule,
    password: (value) => (value ? null : "Informe a senha."),
  });

  useEffect(() => {
    if (state?.ok) onSuccess(state.data.redirectTo);
  }, [state, onSuccess]);

  const redirecting = Boolean(state?.ok);

  return (
    <form action={action} noValidate onSubmit={validation.handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={validation.errorFor("email", fieldError(state, "email"))}>
        <FieldLabel required>E-mail</FieldLabel>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="voce@exemplo.org"
          {...validation.fieldProps("email")}
        />
      </Field>

      <Field error={validation.errorFor("password", fieldError(state, "password"))}>
        <FieldLabel required>Senha</FieldLabel>
        <PasswordInput
          name="password"
          autoComplete="current-password"
          required
          {...validation.fieldProps("password")}
        />
      </Field>

      <Button type="submit" size="lg" loading={pending || redirecting} className="mt-1 w-full">
        {pending ? "Entrando…" : redirecting ? "Redirecionando…" : "Entrar"}
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
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, null);
  const [passwordLength, setPasswordLength] = useState(0);
  const validation = useFormValidation({
    name: (value) => (value.trim() ? null : "Informe o nome completo."),
    email: emailRule,
    password: (value) =>
      value.length >= 10 ? null : "A senha deve ter pelo menos 10 caracteres.",
    passwordConfirmation: (value, form) => {
      const password = (form.elements.namedItem("password") as HTMLInputElement | null)?.value;
      return value && value === password ? null : "As senhas não coincidem.";
    },
  });

  useEffect(() => {
    if (state?.ok) onSuccess(state.data.redirectTo);
  }, [state, onSuccess]);

  const redirecting = Boolean(state?.ok);
  const passwordProps = validation.fieldProps("password");

  return (
    <form action={action} noValidate onSubmit={validation.handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state && !state.ok && !state.field ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={validation.errorFor("name", fieldError(state, "name"))}>
        <FieldLabel required>Nome completo</FieldLabel>
        <Input name="name" autoComplete="name" required maxLength={160} {...validation.fieldProps("name")} />
      </Field>

      <Field error={validation.errorFor("email", fieldError(state, "email"))}>
        <FieldLabel required>E-mail</FieldLabel>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          {...validation.fieldProps("email")}
        />
      </Field>

      <Field
        error={validation.errorFor("password", fieldError(state, "password"))}
        description={
          passwordLength >= 10
            ? "Comprimento adequado."
            : `Pelo menos 10 caracteres${passwordLength > 0 ? ` — faltam ${10 - passwordLength}` : ""}.`
        }
      >
        <FieldLabel required>Senha</FieldLabel>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          required
          minLength={10}
          {...passwordProps}
          onChange={(event) => {
            setPasswordLength(event.target.value.length);
            passwordProps.onChange(event);
          }}
        />
      </Field>

      <Field error={validation.errorFor("passwordConfirmation", fieldError(state, "passwordConfirmation"))}>
        <FieldLabel required>Confirmar senha</FieldLabel>
        <PasswordInput
          name="passwordConfirmation"
          autoComplete="new-password"
          required
          {...validation.fieldProps("passwordConfirmation")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "patronType")}>
          <FieldLabel>Vínculo</FieldLabel>
          <Select name="patronType" defaultValue="">
            <option value="">Informar depois</option>
            {Object.values(PatronType).map((type) => (
              <option key={type} value={type}>
                {patronTypeLabels[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field error={fieldError(state, "registrationId")}>
          <FieldLabel>Matrícula ou SIAPE</FieldLabel>
          <Input name="registrationId" maxLength={60} />
        </Field>
      </div>

      <Button type="submit" size="lg" loading={pending || redirecting} className="mt-1 w-full">
        {pending ? "Criando conta…" : redirecting ? "Redirecionando…" : "Criar conta"}
      </Button>

      <p className="text-[0.8125rem] leading-relaxed text-ink-500">
        Com a conta você solicita reservas e acompanha seus pedidos. Consultar o
        acervo não exige cadastro —{" "}
        <Link href="/acervo" className="underline underline-offset-4 hover:text-ink-800">
          explore livremente
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
