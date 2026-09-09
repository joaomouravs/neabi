import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Botão da Biblioteca NEABI.
 *
 * Formas sóbrias, cantos praticamente retos e peso tipográfico — a linguagem é
 * editorial, não de painel administrativo comprado. Todas as variantes têm
 * altura mínima de 44px em telas de toque (WCAG 2.5.8) e foco visível herdado
 * do estilo global.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-semibold leading-none",
    "transition-[background-color,color,border-color,opacity] duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-[1.05em] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-neabi-red text-white hover:bg-neabi-red-600 active:bg-neabi-red-700",
        dark: "bg-neabi-black text-neabi-cream hover:bg-ink-800",
        outline:
          "border border-ink-900/25 bg-transparent text-ink-900 hover:border-ink-900 hover:bg-ink-900/[0.04]",
        ghost: "bg-transparent text-ink-700 hover:bg-ink-900/[0.06] hover:text-ink-900",
        subtle:
          "bg-neabi-cream-200/70 text-ink-800 hover:bg-neabi-cream-300/70",
        success:
          "bg-neabi-green text-white hover:bg-neabi-green-600 active:bg-neabi-green-700",
        danger:
          "border border-neabi-red/40 bg-transparent text-neabi-red-600 hover:bg-neabi-red-050",
        /** Para superfícies escuras (hero, rodapé). */
        onDark:
          "bg-neabi-cream text-ink-900 hover:bg-white",
        onDarkOutline:
          "border border-neabi-cream/35 bg-transparent text-neabi-cream hover:border-neabi-cream hover:bg-white/10",
        link: "bg-transparent p-0 text-neabi-red-600 underline underline-offset-4 hover:text-neabi-red-700",
      },
      size: {
        sm: "min-h-9 px-3 text-[0.8125rem]",
        md: "min-h-11 px-5 text-[0.9375rem]",
        lg: "min-h-13 px-7 text-base",
        icon: "size-11 p-0",
      },
    },
    compoundVariants: [
      { variant: "link", size: "sm", class: "min-h-0 px-0" },
      { variant: "link", size: "md", class: "min-h-0 px-0" },
      { variant: "link", size: "lg", class: "min-h-0 px-0" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /** Renderiza o filho no lugar do `<button>` — use com `<Link>`. */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      // Sem `asChild`, o padrão do HTML (`submit`) causa envios acidentais.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
