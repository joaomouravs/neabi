import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Etiqueta curta para categoria, tipo de material, status e disponibilidade.
 * Cor nunca é o único portador de significado: todas as variantes carregam
 * texto (WCAG 1.4.1). Todos os pares de cor passam de 4,5:1.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap font-sans text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.08em]",
  {
    variants: {
      variant: {
        neutral: "bg-neabi-cream-200 text-ink-700",
        muted: "bg-neabi-cream-100 text-ink-600 ring-1 ring-inset ring-border-strong",
        outline: "border border-ink-900/20 text-ink-700",
        red: "bg-neabi-red-050 text-neabi-red-700",
        amber: "bg-neabi-amber-050 text-neabi-amber-900",
        green: "bg-neabi-green-050 text-neabi-green-700",
        greenSolid: "bg-neabi-green-600 text-white",
        dark: "bg-neabi-black text-neabi-cream",
        onDark: "bg-white/10 text-neabi-cream",
      },
      size: {
        sm: "px-1.5 py-1",
        md: "px-2 py-1.5",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { badgeVariants };
