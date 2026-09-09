"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  Field,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import {
  patronTypeLabels,
  patronTypesRequiringRegistration,
  shiftLabels,
} from "@/config/catalog";
import {
  createReservationAction,
  type ReservationEcho,
  type ReservationFormState,
} from "@/features/reservations/actions";
import { PatronType, Shift } from "@/generated/prisma/enums";
import { WEEKDAY_LABELS } from "@/validators/settings";

type FormState = ReservationFormState | null;

export interface ReservationFormProps {
  bookSlug: string;
  bookTitle: string;
  availableShifts: Shift[];
  serviceDays: number[];
  minDate: string;
  maxDate: string;
  defaultDate: string;
  instructions: string;
  defaults: {
    fullName: string;
    email: string;
    phone: string;
    registrationId: string;
    patronType: PatronType | null;
  };
}

const PURPOSE_MAX = 500;

/**
 * Formulário de reserva presencial.
 *
 * Valida no cliente para dar retorno imediato, mas a decisão real é tomada no
 * servidor: datas fora dos dias de atendimento, exemplar indisponível e limite
 * de reservas ativas são verificados lá, contra o estado do banco.
 *
 * No sucesso, quem redireciona é a Server Action. Aqui só tratamos a recusa —
 * e, nesse caso, devolvemos ao formulário exatamente o que foi enviado, porque
 * o React reinicia um `<form action>` depois que a ação termina e quem está
 * corrigindo um campo não pode perder o restante do preenchimento.
 */
export function ReservationForm(props: ReservationFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createReservationAction,
    null,
  );

  const submitted = state && !state.ok ? state.values : null;

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="bookSlug" value={props.bookSlug} />

      {state && !state.ok && !state.field ? (
        <Alert variant="danger" title="Não foi possível concluir a solicitação">
          {state.error}
        </Alert>
      ) : null}

      {/*
        A chave remonta os campos a cada resposta do servidor. É o que garante
        que os valores devolvidos virem o novo estado inicial — inclusive nos
        controles que mantêm estado próprio, como o tipo de usuário.
      */}
      <ReservationFields
        key={submitted ? JSON.stringify(submitted) : "inicial"}
        {...props}
        state={state}
        submitted={submitted}
        pending={pending}
      />
    </form>
  );
}

function ReservationFields({
  state,
  submitted,
  pending,
  ...props
}: ReservationFormProps & {
  state: FormState;
  submitted: ReservationEcho | null;
  pending: boolean;
}) {
  const initialPatronType =
    (submitted?.patronType as PatronType | "") || props.defaults.patronType || "";

  /**
   * O tipo de usuário é um campo NÃO controlado com espelho em estado.
   *
   * Motivo: ao reiniciar o formulário, o navegador devolve um `<select>` ao seu
   * `defaultValue`. Um select controlado não tem esse atributo, e a primeira
   * opção habilitada acabaria selecionada sem que o React percebesse — a
   * pessoa veria um vínculo que não escolheu. O estado existe apenas para saber
   * se a matrícula passa a ser obrigatória.
   */
  const [patronType, setPatronType] = useState<PatronType | "">(
    initialPatronType,
  );
  const [purpose, setPurpose] = useState(submitted?.purpose ?? "");

  const registrationRequired =
    patronType !== "" &&
    patronTypesRequiringRegistration.includes(patronType as PatronType);

  const serviceDaysLabel = [...props.serviceDays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-xl font-semibold text-ink-900">
          Seus dados
        </legend>

        <Field error={fieldError(state, "fullName")}>
          <FieldLabel required>Nome completo</FieldLabel>
          <Input
            name="fullName"
            autoComplete="name"
            required
            maxLength={160}
            defaultValue={submitted?.fullName ?? props.defaults.fullName}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={fieldError(state, "email")}>
            <FieldLabel required>E-mail</FieldLabel>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={submitted?.email ?? props.defaults.email}
            />
          </Field>

          <Field error={fieldError(state, "phone")}>
            <FieldLabel required>Telefone</FieldLabel>
            <Input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              inputMode="tel"
              placeholder="(21) 90000-0000"
              defaultValue={submitted?.phone ?? props.defaults.phone}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={fieldError(state, "patronType")}>
            <FieldLabel required>Tipo de usuário</FieldLabel>
            <Select
              name="patronType"
              required
              defaultValue={initialPatronType}
              onChange={(event) =>
                setPatronType(event.target.value as PatronType | "")
              }
            >
              <option value="" disabled>
                Selecione…
              </option>
              {Object.values(PatronType).map((type) => (
                <option key={type} value={type}>
                  {patronTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            error={fieldError(state, "registrationId")}
            description={
              registrationRequired
                ? undefined
                : "Opcional para quem não tem vínculo institucional."
            }
          >
            <FieldLabel required={registrationRequired}>
              Matrícula ou vínculo institucional
            </FieldLabel>
            <Input
              name="registrationId"
              maxLength={60}
              required={registrationRequired}
              defaultValue={
                submitted?.registrationId ?? props.defaults.registrationId
              }
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-xl font-semibold text-ink-900">
          Agendamento
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={fieldError(state, "requestedDate")}
            description={`Atendimento presencial: ${serviceDaysLabel}.`}
          >
            <FieldLabel required>Data desejada</FieldLabel>
            <Input
              name="requestedDate"
              type="date"
              required
              min={props.minDate}
              max={props.maxDate}
              defaultValue={submitted?.requestedDate || props.defaultDate}
            />
          </Field>

          <Field error={fieldError(state, "shift")}>
            <FieldLabel required>Turno</FieldLabel>
            <Select
              name="shift"
              required
              defaultValue={submitted?.shift || props.availableShifts[0]}
            >
              {props.availableShifts.map((shift) => (
                <option key={shift} value={shift}>
                  {shiftLabels[shift]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          error={fieldError(state, "purpose")}
          description={`${purpose.length} de ${PURPOSE_MAX} caracteres.`}
        >
          <FieldLabel>Finalidade da consulta</FieldLabel>
          <Textarea
            name="purpose"
            maxLength={PURPOSE_MAX}
            rows={4}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Conte brevemente para que você pretende consultar esta obra."
          />
        </Field>
      </fieldset>

      {props.instructions ? (
        <section
          aria-labelledby="orientacoes-titulo"
          className="border-l-2 border-neabi-amber bg-neabi-amber-050 px-5 py-4"
        >
          <h2
            id="orientacoes-titulo"
            className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-neabi-amber-900"
          >
            Orientações para retirada e consulta presencial
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-neabi-amber-900">
            {props.instructions}
          </p>
        </section>
      ) : null}

      <CheckboxField
        name="acknowledgement"
        required
        defaultChecked={submitted?.acknowledgement ?? false}
        error={fieldError(state, "acknowledgement")}
        label="Declaro que li as orientações para retirada e consulta presencial."
      />

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending} className="sm:px-10">
          {pending ? "Enviando solicitação…" : "Solicitar reserva"}
        </Button>
        <p className="text-[0.8125rem] leading-snug text-ink-500">
          Sua solicitação será analisada pela equipe do NEABI antes da
          confirmação.
        </p>
      </div>
    </>
  );
}

function fieldError(state: FormState, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
