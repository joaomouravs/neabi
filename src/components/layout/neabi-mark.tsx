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
}: {
  className?: string;
  tone?: "light" | "dark";
  showSubtitle?: boolean;
}) {
  const dark = tone === "dark";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 flex-col overflow-hidden"
      >
        <span className="h-1/3 w-full bg-neabi-red" />
        <span className="h-1/3 w-full bg-neabi-amber" />
        <span className="h-1/3 w-full bg-neabi-green" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[1.375rem] font-bold uppercase tracking-[0.02em]",
            dark ? "text-neabi-cream" : "text-ink-900",
          )}
        >
          Biblioteca NEABI
        </span>
        {showSubtitle ? (
          <span
            className={cn(
              "mt-1 font-sans text-[0.625rem] font-medium uppercase tracking-[0.13em]",
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
