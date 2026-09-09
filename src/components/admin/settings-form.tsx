"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { shiftLabels } from "@/config/catalog";
import { updateSettingsAction } from "@/features/settings/actions";
import { Shift } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";
import { WEEKDAY_LABELS } from "@/validators/settings";

type State = ActionResult<undefined> | null;

export interface SettingsFormDefaults {
  libraryName: string;
  institution: string;
  campus: string;
  email: string;
  phone: string;
  address: string;
  serviceDays: number[];
  availableShifts: Shift[];
  reservationLeadDays: number;
  reservationHorizonDays: number;
  pickupDeadlineDays: number;
  maxActiveReservations: number;
  reservationInstructions: string;
  socialLinks: Record<string, string | undefined>;
}

/**
 * Configurações institucionais.
 *
 * Estes valores não são preferências de interface: mudam as regras que o
 * servidor aplica a toda solicitação de reserva. Por isso o formulário explica
 * o efeito de cada campo em vez de apenas rotulá-lo.
 */
export function SettingsForm({ defaults }: { defaults: SettingsFormDefaults }) {
  const [state, action, pending] = useActionState<State, FormData>(
    updateSettingsAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-10">
      {state?.ok ? <Alert variant="success">Configurações salvas.</Alert> : null}
      {state && !state.ok ? (
        <Alert variant="danger" title="Não foi possível salvar">
          {state.error}
        </Alert>
      ) : null}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-lg font-semibold text-ink-900">
          Identificação
        </legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field error={fieldError(state, "libraryName")}>
            <FieldLabel required>Nome da biblioteca</FieldLabel>
            <Input name="libraryName" defaultValue={defaults.libraryName} required />
          </Field>
          <Field error={fieldError(state, "institution")}>
            <FieldLabel required>Instituição</FieldLabel>
            <Input name="institution" defaultValue={defaults.institution} required />
          </Field>
          <Field error={fieldError(state, "campus")}>
            <FieldLabel required>Campus</FieldLabel>
            <Input name="campus" defaultValue={defaults.campus} required />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
        <legend className="mb-1 font-display text-lg font-semibold text-ink-900">
          Contato
        </legend>
        <p className="-mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-600">
          Campos em branco simplesmente não aparecem no site. É preferível
          omitir a informação a publicar um contato incorreto.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={fieldError(state, "email")}>
            <FieldLabel>E-mail de contato</FieldLabel>
            <Input name="email" type="email" defaultValue={defaults.email} />
          </Field>
          <Field error={fieldError(state, "phone")}>
            <FieldLabel>Telefone</FieldLabel>
            <Input name="phone" defaultValue={defaults.phone} />
          </Field>
        </div>

        <Field error={fieldError(state, "address")}>
          <FieldLabel>Endereço</FieldLabel>
          <Textarea name="address" defaultValue={defaults.address} rows={2} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["instagram", "Instagram"],
              ["facebook", "Facebook"],
              ["youtube", "YouTube"],
              ["x", "X"],
              ["site", "Site institucional"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key}>
              <FieldLabel>{label}</FieldLabel>
              <Input
                name={key}
                defaultValue={defaults.socialLinks[key] ?? ""}
                placeholder="https://"
              />
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
        <legend className="mb-1 font-display text-lg font-semibold text-ink-900">
          Atendimento presencial
        </legend>

        <div>
          <p className="mb-2.5 font-sans text-[0.8125rem] font-semibold text-ink-800">
            Dias de atendimento
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink-700"
              >
                <input
                  type="checkbox"
                  name="serviceDays"
                  value={value}
                  defaultChecked={defaults.serviceDays.includes(Number(value))}
                  className="size-4 cursor-pointer accent-[var(--neabi-red)]"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[0.75rem] text-ink-500">
            Datas fora destes dias são recusadas pelo servidor no formulário de
            reserva.
          </p>
        </div>

        <div>
          <p className="mb-2.5 font-sans text-[0.8125rem] font-semibold text-ink-800">
            Turnos disponíveis
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.values(Shift).map((shift) => (
              <label
                key={shift}
                className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink-700"
              >
                <input
                  type="checkbox"
                  name="availableShifts"
                  value={shift}
                  defaultChecked={defaults.availableShifts.includes(shift)}
                  className="size-4 cursor-pointer accent-[var(--neabi-red)]"
                />
                {shiftLabels[shift]}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
        <legend className="mb-1 font-display text-lg font-semibold text-ink-900">
          Regras de reserva
        </legend>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            error={fieldError(state, "reservationLeadDays")}
            description="Dias mínimos entre o pedido e a data desejada."
          >
            <FieldLabel required>Antecedência mínima</FieldLabel>
            <Input
              name="reservationLeadDays"
              type="number"
              min={0}
              max={60}
              defaultValue={defaults.reservationLeadDays}
              required
            />
          </Field>

          <Field
            error={fieldError(state, "reservationHorizonDays")}
            description="Até quantos dias no futuro é possível agendar."
          >
            <FieldLabel required>Janela de agendamento</FieldLabel>
            <Input
              name="reservationHorizonDays"
              type="number"
              min={1}
              max={365}
              defaultValue={defaults.reservationHorizonDays}
              required
            />
          </Field>

          <Field
            error={fieldError(state, "pickupDeadlineDays")}
            description="Após esse prazo a reserva expira e o exemplar volta ao acervo."
          >
            <FieldLabel required>Prazo de retirada</FieldLabel>
            <Input
              name="pickupDeadlineDays"
              type="number"
              min={1}
              max={60}
              defaultValue={defaults.pickupDeadlineDays}
              required
            />
          </Field>

          <Field
            error={fieldError(state, "maxActiveReservations")}
            description="Reservas simultâneas por pessoa."
          >
            <FieldLabel required>Limite por usuário</FieldLabel>
            <Input
              name="maxActiveReservations"
              type="number"
              min={1}
              max={20}
              defaultValue={defaults.maxActiveReservations}
              required
            />
          </Field>
        </div>

        <Field
          error={fieldError(state, "reservationInstructions")}
          description="Aparece no formulário de reserva, na confirmação e nos e-mails."
        >
          <FieldLabel>Orientações para retirada e consulta presencial</FieldLabel>
          <Textarea
            name="reservationInstructions"
            defaultValue={defaults.reservationInstructions}
            rows={5}
            maxLength={4000}
          />
        </Field>
      </fieldset>

      <div className="border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando…" : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
