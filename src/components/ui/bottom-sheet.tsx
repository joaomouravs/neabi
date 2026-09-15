"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";

/**
 * Painel inferior para telas pequenas (filtros, ordenação).
 *
 * É um diálogo Radix: foco preso dentro do painel, Escape fecha, rolagem do
 * corpo bloqueada e o foco volta ao botão de origem. Sobe em 260ms; com
 * movimento reduzido, só aparece.
 */
export function BottomSheet({
  trigger,
  title,
  description,
  children,
  footer,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: (close: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.26;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
                className="fixed inset-0 z-[60] bg-neabi-black/55"
              />
            </Dialog.Overlay>
            {/* Sem descrição, `aria-describedby` indefinido evita o aviso do Radix. */}
            <Dialog.Content asChild {...(description ? {} : { "aria-describedby": undefined })}>
              <motion.div
                initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
                animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
                transition={{ duration, ease: [0.2, 0.7, 0.2, 1] }}
                className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[88dvh] flex-col bg-background shadow-overlay"
              >
                <div aria-hidden="true" className="neabi-rule h-1 w-full shrink-0" />
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
                  <Dialog.Title className="font-display text-2xl font-bold text-ink-900">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="-mr-2 flex size-11 items-center justify-center text-ink-600 transition-colors hover:text-ink-900"
                    >
                      <X aria-hidden="true" className="size-5" />
                      <span className="sr-only">Fechar {title.toLowerCase()}</span>
                    </button>
                  </Dialog.Close>
                </div>
                {description ? (
                  <Dialog.Description className="sr-only">{description}</Dialog.Description>
                ) : null}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                  {children}
                </div>
                {footer ? (
                  <div className="shrink-0 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                    {footer(() => setOpen(false))}
                  </div>
                ) : null}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
