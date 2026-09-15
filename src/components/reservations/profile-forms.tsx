"use client";

import { LogOut } from "lucide-react";
import { useActionState } from "react";

import {
  changePasswordAction,
  logoutAction,
  updateProfileAction,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, PasswordInput, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { useFormValidation } from "@/components/ui/use-form-validation";
import { patronTypeLabels } from "@/config/catalog";
import { PatronType } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    email: string;
    phone: string;
    registrationId: string;
    patronType: PatronType | null;
  };
}) {
  const [state, action, pending] = useActionState<State, FormData>(updateProfileAction, null);
  const validation = useFormValidation({
    name: (value) => (value.trim() ? null : "Informe o nome completo."),
    phone: (value) => {
      if (!value.trim()) return null;
      const digits = value.replace(/\D/g, "").length;
      return digits >= 10 && digits <= 13 ? null : "Informe um telefone válido com DDD.";
    },
  });

  return (
    <form action={action} noValidate onSubmit={validation.handleSubmit} className="flex flex-col gap-5">
      {state?.ok ? <Alert variant="success">Perfil atualizado.</Alert> : null}
      {state && !state.ok && !state.field ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={validation.errorFor("name", fieldError(state, "name"))}>
        <FieldLabel required>Nome completo</FieldLabel>
        <Input
          name="name"
          autoComplete="name"
          defaultValue={defaults.name}
          required
          maxLength={160}
          {...validation.fieldProps("name")}
        />
      </Field>

      <Field description="O e-mail de acesso não pode ser alterado por aqui. Fale com a equipe do NEABI se precisar trocá-lo.">
        <FieldLabel>E-mail</FieldLabel>
        <Input value={defaults.email} readOnly disabled />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={validation.errorFor("phone", fieldError(state, "phone"))}>
          <FieldLabel>Telefone</FieldLabel>
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(21) 90000-0000"
            defaultValue={defaults.phone}
            maxLength={40}
            {...validation.fieldProps("phone")}
          />
        </Field>

        <Field error={fieldError(state, "patronType")}>
          <FieldLabel>Vínculo</FieldLabel>
          <Select name="patronType" defaultValue={defaults.patronType ?? ""}>
            <option value="">Não informado</option>
            {Object.values(PatronType).map((type) => (
              <option key={type} value={type}>
                {patronTypeLabels[type]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field error={fieldError(state, "registrationId")}>
        <FieldLabel>Matrícula ou vínculo institucional</FieldLabel>
        <Input name="registrationId" defaultValue={defaults.registrationId} maxLength={60} />
      </Field>

      <div>
        <Button type="submit" loading={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(changePasswordAction, null);
  const validation = useFormValidation({
    currentPassword: (value) => (value ? null : "Informe a senha atual."),
    password: (value) =>
      value.length >= 10 ? null : "A senha deve ter pelo menos 10 caracteres.",
    passwordConfirmation: (value, form) => {
      const password = (form.elements.namedItem("password") as HTMLInputElement | null)?.value;
      return value === password ? null : "As senhas não coincidem.";
    },
  });

  return (
    <form action={action} noValidate onSubmit={validation.handleSubmit} className="flex flex-col gap-5">
      {state?.ok ? <Alert variant="success">Senha alterada.</Alert> : null}
      {state && !state.ok && !state.field ? <Alert variant="danger">{state.error}</Alert> : null}

      <Field error={validation.errorFor("currentPassword", fieldError(state, "currentPassword"))}>
        <FieldLabel required>Senha atual</FieldLabel>
        <PasswordInput
          name="currentPassword"
          autoComplete="current-password"
          required
          {...validation.fieldProps("currentPassword")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          error={validation.errorFor("password", fieldError(state, "password"))}
          description="Pelo menos 10 caracteres."
        >
          <FieldLabel required>Nova senha</FieldLabel>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            required
            minLength={10}
            {...validation.fieldProps("password")}
          />
        </Field>

        <Field
          error={validation.errorFor("passwordConfirmation", fieldError(state, "passwordConfirmation"))}
        >
          <FieldLabel required>Confirmar nova senha</FieldLabel>
          <PasswordInput
            name="passwordConfirmation"
            autoComplete="new-password"
            required
            {...validation.fieldProps("passwordConfirmation")}
          />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="outline" loading={pending}>
          {pending ? "Alterando…" : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" className="-ml-3">
        <LogOut aria-hidden="true" />
        Sair da conta
      </Button>
    </form>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
