"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  logoutAction,
  updateProfileAction,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
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
  const [state, action, pending] = useActionState<State, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.ok ? <Alert variant="success">Perfil atualizado.</Alert> : null}
      {state && !state.ok && !state.field ? (
        <Alert variant="danger">{state.error}</Alert>
      ) : null}

      <Field error={fieldError(state, "name")}>
        <FieldLabel required>Nome completo</FieldLabel>
        <Input name="name" defaultValue={defaults.name} required maxLength={160} />
      </Field>

      <Field description="O e-mail de acesso não pode ser alterado por aqui. Fale com a equipe do NEABI se precisar trocá-lo.">
        <FieldLabel>E-mail</FieldLabel>
        <Input value={defaults.email} readOnly disabled />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "phone")}>
          <FieldLabel>Telefone</FieldLabel>
          <Input
            name="phone"
            type="tel"
            defaultValue={defaults.phone}
            maxLength={40}
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
        <Input
          name="registrationId"
          defaultValue={defaults.registrationId}
          maxLength={60}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.ok ? <Alert variant="success">Senha alterada.</Alert> : null}
      {state && !state.ok && !state.field ? (
        <Alert variant="danger">{state.error}</Alert>
      ) : null}

      <Field error={fieldError(state, "currentPassword")}>
        <FieldLabel required>Senha atual</FieldLabel>
        <Input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          error={fieldError(state, "password")}
          description="Pelo menos 10 caracteres."
        >
          <FieldLabel required>Nova senha</FieldLabel>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </Field>

        <Field error={fieldError(state, "passwordConfirmation")}>
          <FieldLabel required>Confirmar nova senha</FieldLabel>
          <Input
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Alterando…" : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost">
        Sair da conta
      </Button>
    </form>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
