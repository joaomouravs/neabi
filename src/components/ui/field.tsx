"use client";

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Campos de formulário acessíveis.
 *
 * `Field` distribui um `id` estável para o controle, a descrição e a mensagem
 * de erro, e conecta tudo por `aria-describedby` / `aria-invalid`. Nenhuma tela
 * precisa lembrar de fazer essa ligação à mão — que é justamente onde a
 * acessibilidade costuma se perder.
 */

interface FieldContextValue {
  id: string;
  descriptionId: string;
  errorId: string;
  hasError: boolean;
  hasDescription: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useField(): FieldContextValue {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error("Os componentes de campo precisam estar dentro de <Field>.");
  }
  return context;
}

export interface FieldProps {
  children: ReactNode;
  error?: string | null;
  description?: string | null;
  className?: string;
}

export function Field({ children, error, description, className }: FieldProps) {
  const id = useId();
  return (
    <FieldContext.Provider
      value={{
        id,
        descriptionId: `${id}-description`,
        errorId: `${id}-error`,
        hasError: Boolean(error),
        hasDescription: Boolean(description),
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        {children}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({
  children,
  required,
  className,
  ...props
}: ComponentProps<"label"> & { required?: boolean }) {
  const { id } = useField();
  return (
    <label
      htmlFor={id}
      className={cn(
        "font-sans text-[0.8125rem] font-semibold text-ink-800",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <>
          {" "}
          <span className="text-neabi-red" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (obrigatório)</span>
        </>
      ) : null}
    </label>
  );
}

function FieldDescription({ children }: { children: ReactNode }) {
  const { descriptionId } = useField();
  return (
    <p id={descriptionId} className="text-[0.8125rem] leading-snug text-ink-500">
      {children}
    </p>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  const { errorId } = useField();
  return (
    <p
      id={errorId}
      // `alert` faz leitores de tela anunciarem o erro assim que ele aparece.
      role="alert"
      className="text-[0.8125rem] font-medium leading-snug text-neabi-red-700"
    >
      {children}
    </p>
  );
}

/** Atributos ARIA derivados do estado do campo. */
function useControlProps() {
  const { id, descriptionId, errorId, hasError, hasDescription } = useField();
  const describedBy =
    [hasDescription ? descriptionId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return {
    id,
    "aria-invalid": hasError || undefined,
    "aria-describedby": describedBy,
  } as const;
}

const controlBase = [
  "w-full min-h-11 bg-white px-3 py-2.5",
  "border border-ink-900/20",
  "font-sans text-[0.9375rem] text-ink-900",
  "placeholder:text-ink-400",
  "transition-colors duration-150",
  "hover:border-ink-900/35",
  "focus:border-ink-900 focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-neabi-cream-100 disabled:text-ink-500",
  "aria-[invalid=true]:border-neabi-red aria-[invalid=true]:bg-neabi-red-050/40",
].join(" ");

export function Input({ className, ...props }: ComponentProps<"input">) {
  const controlProps = useControlProps();
  return <input {...controlProps} className={cn(controlBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const controlProps = useControlProps();
  return (
    <textarea
      {...controlProps}
      className={cn(controlBase, "min-h-28 resize-y leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  const controlProps = useControlProps();
  return (
    <select
      {...controlProps}
      className={cn(
        controlBase,
        "cursor-pointer appearance-none bg-[length:11px] bg-[right_0.85rem_center] bg-no-repeat pr-9",
        "bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 11 7\"><path d=\"M1 1l4.5 4.5L10 1\" fill=\"none\" stroke=\"%234D4842\" stroke-width=\"1.6\"/></svg>')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Caixa de seleção com área de toque adequada. O rótulo é clicável e o
 * indicador visual é desenhado com o próprio input estilizado, mantendo o
 * comportamento nativo de teclado.
 */
export function CheckboxField({
  label,
  error,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode; error?: string | null }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "mt-0.5 size-5 shrink-0 cursor-pointer appearance-none border border-ink-900/35 bg-white",
            "checked:border-neabi-red checked:bg-neabi-red",
            "checked:bg-[length:12px] checked:bg-center checked:bg-no-repeat",
            "checked:bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 12 10\"><path d=\"M1 5l3.2 3.2L11 1.4\" fill=\"none\" stroke=\"white\" stroke-width=\"2\"/></svg>')]",
            "aria-[invalid=true]:border-neabi-red",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className="cursor-pointer text-[0.9375rem] leading-snug text-ink-800"
        >
          {label}
        </label>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="pl-8 text-[0.8125rem] font-medium text-neabi-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
