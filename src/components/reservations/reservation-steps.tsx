import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Livro selecionado" },
  { number: 2, label: "Reserva presencial" },
  { number: 3, label: "Confirmação" },
] as const;

/**
 * Indicador de etapas do fluxo de reserva.
 *
 * A etapa atual é marcada com `aria-current="step"`; as concluídas trazem
 * texto para leitores de tela, porque a diferença visual (cor e traço) não
 * pode ser o único indicador de estado.
 */
export function ReservationSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Etapas da reserva">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
        {STEPS.map((step, index) => {
          const done = step.number < current;
          const active = step.number === current;

          return (
            <li
              key={step.number}
              aria-current={active ? "step" : undefined}
              className="flex flex-1 items-center gap-3"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center font-sans text-[0.8125rem] font-bold",
                  active && "bg-neabi-red text-white",
                  done && "bg-neabi-green text-white",
                  !active && !done && "bg-neabi-cream-200 text-ink-500",
                )}
              >
                <span aria-hidden="true">{done ? "✓" : step.number}</span>
              </span>

              <span
                className={cn(
                  "font-sans text-[0.875rem]",
                  active ? "font-semibold text-ink-900" : "text-ink-500",
                )}
              >
                {step.label}
                {done ? <span className="sr-only"> (concluída)</span> : null}
              </span>

              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-2 hidden h-px flex-1 sm:block",
                    done ? "bg-neabi-green/40" : "bg-border-strong",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
