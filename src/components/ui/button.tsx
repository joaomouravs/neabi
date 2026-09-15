import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Botão da Biblioteca NEABI.
 *
 * Formas sóbrias, cantos praticamente retos e peso tipográfico — a linguagem é
 * editorial, não de painel administrativo comprado. As variantes principais
 * têm altura mínima de 44px em telas de toque (WCAG 2.5.8) e foco visível
 * herdado do estilo global. O "pressionado" desce um pixel: resposta tátil
 * sem animação que atrase o clique.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-semibold leading-none select-none",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-editorial",
    "active:translate-y-px motion-reduce:active:translate-y-0",
    "disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
    "[&_svg]:size-[1.1em] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Vermelho derivado (#C9241B): 5,6:1 com branco. O institucional puro
        // não atinge 4,5:1 em texto de 15px.
        primary:
          "bg-neabi-red-600 text-white hover:bg-neabi-red-700 active:bg-neabi-red-900",
        dark: "bg-neabi-black text-neabi-cream hover:bg-ink-700 active:bg-ink-800",
        outline:
          "border border-ink-900/25 bg-transparent text-ink-900 hover:border-ink-900 hover:bg-ink-900/[0.04] active:bg-ink-900/[0.08]",
        ghost:
          "bg-transparent text-ink-700 hover:bg-ink-900/[0.06] hover:text-ink-900 active:bg-ink-900/[0.1]",
        subtle:
          "bg-neabi-cream-200/70 text-ink-800 hover:bg-neabi-cream-300/70 active:bg-neabi-cream-300",
        success:
          "bg-neabi-green text-white hover:bg-neabi-green-600 active:bg-neabi-green-700",
        danger:
          "border border-neabi-red-600/40 bg-transparent text-neabi-red-700 hover:border-neabi-red-600 hover:bg-neabi-red-050 active:bg-neabi-red-100",
        /** Para superfícies escuras (hero, rodapé). */
        onDark: "bg-neabi-cream text-ink-900 hover:bg-white active:bg-neabi-cream-200",
        onDarkOutline:
          "border border-neabi-cream/35 bg-transparent text-neabi-cream hover:border-neabi-cream hover:bg-white/10 active:bg-white/15",
        link: "bg-transparent p-0 text-neabi-red-600 underline underline-offset-4 hover:text-neabi-red-700",
      },
      size: {
        sm: "min-h-9 px-3.5 text-[0.8125rem]",
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
  /**
   * Estado de envio: desabilita, anuncia `aria-busy` e mostra o indicador.
   * O texto do botão continua visível — quem usa leitor de tela ouve o rótulo
   * atualizado ("Enviando…") passado pelo próprio formulário.
   */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  type,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      // Sem `type`, o padrão do HTML (`submit`) causa envios acidentais.
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
      ) : null}
      {children}
    </button>
  );
}

export { buttonVariants };
