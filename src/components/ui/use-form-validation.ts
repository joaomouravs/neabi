"use client";

import { useRef, useState, type FormEvent } from "react";

/**
 * Validação imediata no cliente.
 *
 * Um campo passa a ser validado quando perde o foco pela primeira vez; depois
 * disso, cada alteração revalida — o erro some assim que a pessoa corrige, sem
 * esperar o envio. No envio, tudo é conferido e o foco vai para o primeiro
 * campo inválido.
 *
 * É conveniência de interface: a Server Action valida de novo e decide.
 */

export type FieldRule = (value: string, form: HTMLFormElement) => string | null;

export type FieldErrors = Record<string, string | null | undefined>;

interface ControlEvent {
  currentTarget: { form: HTMLFormElement | null };
}

function readValue(form: HTMLFormElement, name: string): string {
  const element = form.elements.namedItem(name);
  if (!element) return "";
  if (element instanceof HTMLInputElement && element.type === "checkbox") {
    return element.checked ? "on" : "";
  }
  if ("value" in element) return String(element.value ?? "");
  return "";
}

export function useFormValidation(rules: Record<string, FieldRule>) {
  const [errors, setErrors] = useState<FieldErrors>({});
  // Lido e escrito apenas em manipuladores de evento, nunca na renderização.
  const touched = useRef(new Set<string>());

  function runTouched(form: HTMLFormElement) {
    const next: FieldErrors = {};
    for (const name of touched.current) {
      const rule = rules[name];
      if (rule) next[name] = rule(readValue(form, name), form);
    }
    setErrors((previous) => ({ ...previous, ...next }));
  }

  /** Propriedades para espalhar no controle: `{...fieldProps("email")}`. */
  function fieldProps(name: string) {
    return {
      onBlur: (event: ControlEvent) => {
        const form = event.currentTarget.form;
        if (!form) return;
        touched.current.add(name);
        runTouched(form);
      },
      onChange: (event: ControlEvent) => {
        const form = event.currentTarget.form;
        // Revalida todos os campos já visitados: a confirmação de senha depende
        // da senha, a matrícula depende do vínculo.
        if (form && touched.current.size > 0) runTouched(form);
      },
    };
  }

  /** Valida tudo; retorna `false` e foca o primeiro campo inválido. */
  function validateAll(form: HTMLFormElement): boolean {
    const next: FieldErrors = {};
    let firstInvalid: string | null = null;
    for (const [name, rule] of Object.entries(rules)) {
      touched.current.add(name);
      const message = rule(readValue(form, name), form);
      next[name] = message;
      if (message && !firstInvalid) firstInvalid = name;
    }
    setErrors(next);

    if (firstInvalid) {
      const element = form.elements.namedItem(firstInvalid);
      if (element instanceof HTMLElement) element.focus();
      return false;
    }
    return true;
  }

  /** `onSubmit` pronto: impede o envio (e a Server Action) quando há erro. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateAll(event.currentTarget)) event.preventDefault();
  }

  /**
   * Erro a exibir: o do cliente, depois que o campo foi visitado; senão, o que
   * veio do servidor.
   */
  function errorFor(name: string, serverError?: string | null) {
    if (name in errors) return errors[name] ?? null;
    return serverError ?? null;
  }

  return { errors, fieldProps, validateAll, handleSubmit, errorFor };
}
