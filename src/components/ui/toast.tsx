"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Notificações passageiras.
 *
 * Para confirmações de ações que não mudam de página — copiar referência,
 * compartilhar, salvar perfil. Nunca para erro que exige decisão: esse fica
 * no próprio formulário, junto do campo.
 */

type ToastTone = "success" | "info" | "danger";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const ICONS = { success: CircleCheck, info: Info, danger: TriangleAlert } as const;

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);
  const reducedMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue["notify"]>(
    ({ title, description, tone = "success" }) => {
      counter.current += 1;
      const id = counter.current;
      // Três no máximo: mais que isso vira ruído, não informação.
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notificações"
        role="region"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-90 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout={!reducedMotion}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
                role="status"
                className="on-dark pointer-events-auto flex w-full max-w-sm items-start gap-3 bg-neabi-black py-3.5 pl-4 pr-2 text-neabi-cream shadow-overlay"
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 size-4.5 shrink-0",
                    toast.tone === "success" && "text-neabi-green-200",
                    toast.tone === "info" && "text-neabi-amber",
                    toast.tone === "danger" && "text-neabi-red-200",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold leading-snug">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-[0.8125rem] leading-snug text-neabi-cream/70">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="flex size-8 shrink-0 items-center justify-center text-neabi-cream/60 transition-colors hover:text-neabi-cream"
                >
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">Fechar notificação</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
