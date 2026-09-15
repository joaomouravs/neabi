import { cn } from "@/lib/utils";

/**
 * Marca da Biblioteca NEABI.
 *
 * Composição tipográfica com as três cores institucionais — não é o logotipo
 * oficial do núcleo. Quando o NEABI fornecer o arquivo vetorial da marca, basta
 * substituir o conteúdo deste componente: nenhuma tela referencia a marca de
 * outra forma.
 */
export function NeabiMark({
  className,
  tone = "light",
  showSubtitle = true,
  size = "md",
}: {
  className?: string;
  tone?: "light" | "dark";
  showSubtitle?: boolean;
  size?: "sm" | "md";
}) {
  const dark = tone === "dark";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 flex-col overflow-hidden transition-[width,height] duration-200 ease-editorial",
          size === "sm" ? "size-8" : "size-9",
        )}
      >
        <span className="h-1/3 w-full bg-neabi-red" />
        <span className="h-1/3 w-full bg-neabi-amber" />
        <span className="h-1/3 w-full bg-neabi-green" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "whitespace-nowrap font-display font-bold uppercase tracking-[0.02em] transition-[font-size] duration-200 ease-editorial",
            size === "sm" ? "text-[1.25rem]" : "text-[1.375rem]",
            dark ? "text-neabi-cream" : "text-ink-900",
          )}
        >
          Biblioteca NEABI
        </span>
        {showSubtitle ? (
          <span
            className={cn(
              "mt-1 whitespace-nowrap font-sans text-[0.625rem] font-medium uppercase tracking-[0.13em]",
              dark ? "text-neabi-cream/65" : "text-ink-500",
            )}
          >
            CEFET/RJ · Nova Iguaçu
          </span>
        ) : null}
      </span>
    </span>
  );
}
