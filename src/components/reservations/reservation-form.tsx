"use client";

import { Check } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

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
import { useFormValidation, type FieldRule } from "@/components/ui/use-form-validation";
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
import { cn } from "@/lib/utils";
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
  /** Resumo da obra, renderizado no servidor — fica fixo ao lado no desktop. */
  summary: ReactNode;
}

const PURPOSE_MAX = 500;

const SECTIONS = [
  { id: "secao-dados", number: 1, title: "Seus dados" },
  { id: "secao-data", number: 2, title: "Data e período" },
  { id: "secao-finalidade", number: 3, title: "Finalidade da consulta" },
  { id: "secao-confirmacao", number: 4, title: "Confirmação" },
] as const;

const SHIFT_HINTS: Record<Shift, string> = {
  MORNING: "Primeira metade do dia",
  AFTERNOON: "Segunda metade do dia",
  EVENING: "Início da noite",
};

/**
 * Formulário de reserva presencial.
 *
 * Quatro seções curtas em vez de um formulário único e cansativo. Cada campo
 * é validado assim que perde o foco — a pessoa não descobre todos os erros só
 * no envio. A decisão real continua no servidor: dias de atendimento,
 * exemplar indisponível e limite de reservas ativas são verificados lá.
 *
 * No sucesso, quem redireciona é a Server Action. Aqui só tratamos a recusa —
 * e, nesse caso, devolvemos ao formulário exatamente o que foi enviado, porque
 * o React reinicia um `<form action>` depois que a ação termina.
 */
export function ReservationForm(props: ReservationFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createReservationAction,
    null,
  );

  const submitted = state && !state.ok ? state.values : null;

  return (
    // A chave remonta os campos a cada resposta do servidor: os valores
    // devolvidos viram o novo estado inicial, inclusive nos controles com
    // estado próprio.
    <ReservationFields
      key={submitted ? JSON.stringify(submitted) : "inicial"}
      {...props}
      action={action}
      state={state}
      submitted={submitted}
      pending={pending}
    />
  );
}

function ReservationFields({
  action,
  state,
  submitted,
  pending,
  summary,
  ...props
}: ReservationFormProps & {
  action: (formData: FormData) => void;
  state: FormState;
  submitted: ReservationEcho | null;
  pending: boolean;
}) {
  const initialPatronType =
    (submitted?.patronType as PatronType | "") || props.defaults.patronType || "";

  /**
   * O tipo de usuário é um campo NÃO controlado com espelho em estado: ao
   * reiniciar o formulário, o navegador devolve o `<select>` ao `defaultValue`,
   * que um select controlado não tem. O estado só decide se a matrícula passa
   * a ser obrigatória.
   */
  const [patronType, setPatronType] = useState<PatronType | "">(initialPatronType);
  const [purpose, setPurpose] = useState(submitted?.purpose ?? "");
  const [requestedDate, setRequestedDate] = useState(
    submitted?.requestedDate || props.defaultDate,
  );
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const registrationRequired =
    patronType !== "" && patronTypesRequiringRegistration.includes(patronType as PatronType);

  const serviceDays = [...props.serviceDays].sort((a, b) => a - b);
  const serviceDaysLabel = serviceDays.map((day) => WEEKDAY_LABELS[day]).filter(Boolean).join(", ");

  const rules: Record<string, FieldRule> = {
    fullName: (value) => (value.trim() ? null : "Informe o nome completo."),
    email: (value) =>
      !value.trim()
        ? "Informe o e-mail."
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? null
          : "Informe um e-mail válido.",
    phone: (value) => {
      if (!value.trim()) return "Informe o telefone.";
      const digits = value.replace(/\D/g, "").length;
      return digits >= 10 && digits <= 13 ? null : "Informe um telefone válido com DDD.";
    },
    patronType: (value) => (value ? null : "Selecione o tipo de usuário."),
    registrationId: (value, form) => {
      const type = (form.elements.namedItem("patronType") as HTMLSelectElement | null)?.value;
      const required =
        Boolean(type) && patronTypesRequiringRegistration.includes(type as PatronType);
      return required && !value.trim() ? "Informe a matrícula ou o vínculo institucional." : null;
    },
    requestedDate: (value) => dateError(value, props.minDate, props.maxDate, serviceDays, serviceDaysLabel),
    purpose: (value) =>
      value.length > PURPOSE_MAX ? `A finalidade deve ter no máximo ${PURPOSE_MAX} caracteres.` : null,
    acknowledgement: (value) =>
      value ? null : "É necessário declarar a leitura das orientações.",
  };

  const validation = useFormValidation(rules);
  const serverError = (field: string) =>
    state && !state.ok && state.field === field ? state.error : null;
  const errorFor = (field: string) => validation.errorFor(field, serverError(field));

  /** Marca as seções completas no indicador de progresso (sem exibir erros). */
  function updateProgress(form: HTMLFormElement) {
    const value = (name: string) => {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLInputElement && element.type === "checkbox") {
        return element.checked ? "on" : "";
      }
      if (element instanceof RadioNodeList) return element.value;
      return element && "value" in element ? String(element.value) : "";
    };
    const ok = (names: string[]) => names.every((name) => rules[name](value(name), form) === null);
    setProgress({
      "secao-dados": ok(["fullName", "email", "phone", "patronType", "registrationId"]),
      "secao-data": ok(["requestedDate"]) && Boolean(value("shift")),
      "secao-finalidade": ok(["purpose"]) && value("purpose").trim().length > 0,
      "secao-confirmacao": ok(["acknowledgement"]),
    });
  }

  const formattedDate = formatLongWeekday(requestedDate);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-16">
      <aside className="min-w-0 lg:order-2">
        <div className="lg:sticky lg:top-[calc(var(--header-height-compact)+1.5rem)]">
          {summary}
          <nav aria-label="Seções do formulário" className="mt-6 hidden lg:block">
            <p className="eyebrow tracking-[0.12em] text-ink-500">Seu progresso</p>
            <ol className="mt-3 border-l border-border-strong">
              {SECTIONS.map((section) => {
                const done = Boolean(progress[section.id]);
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group -ml-px flex min-h-10 items-center gap-3 border-l-2 border-transparent pl-4 text-[0.9375rem] text-ink-700 transition-colors hover:border-ink-900 hover:text-ink-900"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center font-sans text-[0.75rem] font-bold transition-colors",
                          done ? "bg-neabi-green text-white" : "bg-neabi-cream-200 text-ink-600",
                        )}
                      >
                        {done ? <Check className="size-3.5" strokeWidth={3} /> : section.number}
                      </span>
                      {section.title}
                      {done ? <span className="sr-only"> (preenchida)</span> : null}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </aside>

      <form
        action={action}
        noValidate
        onSubmit={validation.handleSubmit}
        onChange={(event) => updateProgress(event.currentTarget)}
        onBlur={(event) => updateProgress(event.currentTarget)}
        className="flex min-w-0 flex-col gap-5 lg:order-1"
      >
        <input type="hidden" name="bookSlug" value={props.bookSlug} />

        {state && !state.ok && !state.field ? (
          <Alert variant="danger" title="Não foi possível concluir a solicitação">
            {state.error}
          </Alert>
        ) : null}

        <FormSection {...SECTIONS[0]} description="Preenchidos a partir do seu perfil. Ajuste o que for preciso para esta solicitação.">
          <Field error={errorFor("fullName")}>
            <FieldLabel required>Nome completo</FieldLabel>
            <Input
              name="fullName"
              autoComplete="name"
              required
              maxLength={160}
              defaultValue={submitted?.fullName ?? props.defaults.fullName}
              {...validation.fieldProps("fullName")}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errorFor("email")}>
              <FieldLabel required>E-mail</FieldLabel>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={submitted?.email ?? props.defaults.email}
                {...validation.fieldProps("email")}
              />
            </Field>

            <Field error={errorFor("phone")}>
              <FieldLabel required>Telefone</FieldLabel>
              <Input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                inputMode="tel"
                placeholder="(21) 90000-0000"
                defaultValue={submitted?.phone ?? props.defaults.phone}
                {...validation.fieldProps("phone")}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errorFor("patronType")}>
              <FieldLabel required>Tipo de usuário</FieldLabel>
              <Select
                name="patronType"
                required
                defaultValue={initialPatronType}
                {...validation.fieldProps("patronType")}
                onChange={(event) => {
                  setPatronType(event.target.value as PatronType | "");
                  validation.fieldProps("patronType").onChange(event);
                }}
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
              error={errorFor("registrationId")}
              description={
                registrationRequired
                  ? "Obrigatória para estudantes, docentes e técnicos."
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
                defaultValue={submitted?.registrationId ?? props.defaults.registrationId}
                {...validation.fieldProps("registrationId")}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          {...SECTIONS[1]}
          description={`O atendimento presencial acontece ${serviceDaysLabel ? `às ${serviceDaysLabel.toLowerCase()}` : "nos dias definidos pelo núcleo"}.`}
        >
          <Field
            error={errorFor("requestedDate")}
            description={formattedDate && !errorFor("requestedDate") ? formattedDate : undefined}
          >
            <FieldLabel required>Data desejada</FieldLabel>
            <Input
              name="requestedDate"
              type="date"
              required
              min={props.minDate}
              max={props.maxDate}
              defaultValue={submitted?.requestedDate || props.defaultDate}
              {...validation.fieldProps("requestedDate")}
              onChange={(event) => {
                setRequestedDate(event.target.value);
                validation.fieldProps("requestedDate").onChange(event);
              }}
              className="sm:max-w-xs"
            />
          </Field>

          <fieldset>
            <legend className="font-sans text-[0.8125rem] font-semibold text-ink-800">
              Turno{" "}
              <span aria-hidden="true" className="text-neabi-red-600">
                *
              </span>
              <span className="sr-only"> (obrigatório)</span>
            </legend>
            <div
              className={cn(
                "mt-2 grid gap-2",
                props.availableShifts.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              {props.availableShifts.map((shift, index) => (
                <label
                  key={shift}
                  className="group relative flex min-h-16 cursor-pointer flex-col justify-center border border-ink-900/20 bg-white px-4 py-3 transition-colors hover:border-ink-900/45 has-[:checked]:border-ink-900 has-[:checked]:bg-neabi-cream-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neabi-red-600"
                >
                  <input
                    type="radio"
                    name="shift"
                    value={shift}
                    required
                    defaultChecked={
                      submitted?.shift ? submitted.shift === shift : index === 0
                    }
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-xl font-semibold text-ink-900">
                      {shiftLabels[shift]}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex size-5 items-center justify-center rounded-full border border-ink-900/30 group-has-[:checked]:border-neabi-red-600 group-has-[:checked]:bg-neabi-red-600"
                    >
                      <span className="size-2 rounded-full bg-white" />
                    </span>
                  </span>
                  <span className="mt-0.5 text-[0.8125rem] text-ink-500">{SHIFT_HINTS[shift]}</span>
                </label>
              ))}
            </div>
            {serverError("shift") ? (
              <p role="alert" className="mt-2 text-[0.8125rem] font-medium text-neabi-red-700">
                {serverError("shift")}
              </p>
            ) : null}
          </fieldset>
        </FormSection>

        <FormSection {...SECTIONS[2]} description="Opcional, mas ajuda a equipe a preparar o atendimento.">
          <Field
            error={errorFor("purpose")}
            description={`${purpose.length} de ${PURPOSE_MAX} caracteres.`}
          >
            <FieldLabel>Finalidade da consulta</FieldLabel>
            <Textarea
              name="purpose"
              maxLength={PURPOSE_MAX}
              rows={4}
              value={purpose}
              {...validation.fieldProps("purpose")}
              onChange={(event) => {
                setPurpose(event.target.value);
                validation.fieldProps("purpose").onChange(event);
              }}
              placeholder="Ex.: pesquisa para trabalho de conclusão de curso, preparação de aula, leitura."
            />
          </Field>
        </FormSection>

        <FormSection {...SECTIONS[3]}>
          {props.instructions ? (
            <div className="border-l-2 border-neabi-amber bg-neabi-amber-050 px-5 py-4">
              <h3 className="eyebrow tracking-[0.12em] text-neabi-amber-900">
                Orientações para retirada e consulta presencial
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-neabi-amber-900">
                {props.instructions}
              </p>
            </div>
          ) : null}

          <ul className="flex flex-col gap-2 text-[0.9375rem] leading-relaxed text-ink-700">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-neabi-red" />
              Enviar a solicitação <strong className="font-semibold text-ink-900">não confirma</strong> a
              reserva: a equipe do NEABI analisa cada pedido.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-neabi-red" />
              Acompanhe o status em Minhas reservas e compareça só depois da aprovação.
            </li>
          </ul>

          <CheckboxField
            name="acknowledgement"
            required
            defaultChecked={submitted?.acknowledgement ?? false}
            error={errorFor("acknowledgement")}
            label="Declaro que li as orientações para retirada e consulta presencial."
            {...validation.fieldProps("acknowledgement")}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:gap-5">
            <Button type="submit" size="lg" loading={pending} className="sm:px-10">
              {pending ? "Enviando solicitação…" : "Solicitar reserva"}
            </Button>
            <p className="text-[0.8125rem] leading-snug text-ink-500">
              Sua solicitação será analisada pela equipe do NEABI antes da confirmação.
            </p>
          </div>
        </FormSection>
      </form>
    </div>
  );
}

function FormSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-titulo`;
  return (
    // Sem `aria-labelledby` de propósito: a seção não vira uma região
    // nomeada. Quatro landmarks num formulário são ruído, e "Finalidade da
    // consulta" nomearia ao mesmo tempo a região e o campo de texto. O `<h2>`
    // continua servindo à navegação por títulos.
    <section id={id} className="scroll-mt-28 border border-border bg-surface">
      <div className="flex items-start gap-4 border-b border-border px-5 py-4 sm:px-7 sm:py-5">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center bg-neabi-black font-display text-lg font-bold text-neabi-cream"
        >
          {number}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={headingId} className="font-display text-[1.5rem] font-bold leading-tight text-ink-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[0.875rem] leading-snug text-ink-600">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-5 px-5 py-6 sm:px-7">{children}</div>
    </section>
  );
}

function dateError(
  value: string,
  min: string,
  max: string,
  serviceDays: number[],
  serviceDaysLabel: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Selecione a data desejada.";
  if (value < min) return `Escolha uma data a partir de ${formatShort(min)}.`;
  if (value > max) return `Escolha uma data até ${formatShort(max)}.`;
  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
  if (serviceDays.length > 0 && !serviceDays.includes(weekday)) {
    return `Não há atendimento neste dia. Escolha: ${serviceDaysLabel.toLowerCase()}.`;
  }
  return null;
}

function formatShort(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatLongWeekday(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const text = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
