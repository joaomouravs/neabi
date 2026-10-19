import type { NeabiTone } from "@/config/catalog";
import { cn } from "@/lib/utils";

/**
 * Ficha do sistema para obras sem fotografia de capa.
 *
 * **Não é uma capa.** É uma ficha da Biblioteca NEABI-NI que ocupa o lugar da
 * fotografia enquanto ela não existe: tipografia institucional sobre o preto da
 * identidade, a faixa de três cores do núcleo e, no rodapé, a etiqueta "Sem
 * fotografia de capa" — para que ninguém confunda a composição com a arte
 * editorial da obra. Nada aqui imita, recompõe ou substitui a capa impressa.
 *
 * Serve a qualquer obra com `coverImage` nulo e também ao caso em que o arquivo
 * indicado falha ao carregar, evitando o ícone de imagem quebrada.
 *
 * Decorativa para leitores de tela (`aria-hidden`): título, autoria e eixo já
 * são anunciados pelo cartão ou pela página da obra. A tipografia usa unidades
 * de contêiner (`cqw`), então a mesma composição funciona numa miniatura de
 * 88px e numa ficha de 320px.
 */
export function BookCoverPlaceholder({
  title,
  tone = "red",
  categoryName,
  credit,
  theme = "dark",
}: {
  title: string;
  tone?: NeabiTone;
  categoryName?: string | null;
  credit?: string | null;
  /**
   * `light` para fichas sobre superfícies escuras (hero, seções pretas): ficha
   * preta sobre fundo preto desaparece.
   */
  theme?: "dark" | "light";
}) {
  const light = theme === "light";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 flex flex-col justify-between",
        light
          ? "bg-neabi-cream text-ink-900"
          : "bg-neabi-black text-neabi-cream",
      )}
    >
      {/* Faixa institucional: vermelho, âmbar e verde do NEABI. */}
      <div
        className={cn(
          "h-[max(3px,1.4cqw)] w-full shrink-0",
          "bg-[linear-gradient(to_right,var(--neabi-red)_0_33.33%,var(--neabi-amber)_33.33%_66.66%,var(--neabi-green)_66.66%_100%)]",
        )}
      />

      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-[4cqw] p-[8cqw]">
        {/*
          Grafismo do fundo: textura, não ilustração. Fica à direita, na faixa
          entre o título e o rodapé, com opacidade baixa — perto demais do
          eyebrow ou da barra de tom, ele lê como um segundo elemento gráfico
          disputando o mesmo canto.
        */}
        <div
          className={cn(
            "neabi-pattern-diamonds pointer-events-none absolute right-[-3cqw] top-[46%] h-[18cqw] w-[22cqw]",
            light ? "opacity-[0.07]" : "opacity-[0.09]",
            TONE_PATTERN[tone],
          )}
        />

        {/*
          Numa miniatura estreita o eixo temático só cabe truncado no meio de
          uma palavra, e o cartão já o mostra por extenso ao lado. Some abaixo
          de 120px, junto com a etiqueta do rodapé.
        */}
        <p
          className={cn(
            // `truncate` em vez de `line-clamp-1`: o line-clamp traz um
            // `display` próprio, que venceria o `hidden` da miniatura.
            "hidden truncate font-sans text-[max(0.4375rem,4.2cqw)] font-semibold uppercase tracking-[0.16em] @[120px]:block",
            light ? "text-ink-600" : "text-neabi-cream/55",
          )}
        >
          {categoryName ?? "Acervo NEABI"}
        </p>

        <p
          className={cn(
            "line-clamp-5 text-balance font-display text-[max(0.625rem,11cqw)] font-semibold uppercase leading-[0.96] tracking-[0.005em]",
            light ? "text-ink-900" : "text-neabi-cream",
          )}
        >
          {title}
        </p>

        <div className="relative">
          {credit ? (
            <p
              className={cn(
                "line-clamp-2 font-sans text-[max(0.4375rem,4.4cqw)] leading-snug",
                light ? "text-ink-600" : "text-neabi-cream/60",
              )}
            >
              {credit}
            </p>
          ) : null}
          <div
            className={cn(
              "mt-[4cqw] h-[max(3px,1.4cqw)] w-[28%]",
              TONE_BAR[tone],
            )}
          />
        </div>
      </div>

      {/*
        A etiqueta é o que separa uma ficha do sistema de uma capa fabricada.
        Some abaixo de ~120px de largura, onde o texto seria ilegível e o
        cartão já explica a ausência por escrito.
      */}
      <div
        className={cn(
          "hidden shrink-0 items-center justify-between gap-2 border-t px-[8cqw] py-[4cqw] @[120px]:flex",
          light
            ? "border-ink-900/12 text-ink-500"
            : "border-neabi-cream/15 text-neabi-cream/45",
        )}
      >
        <span className="truncate font-sans text-[max(0.375rem,3.4cqw)] uppercase tracking-[0.14em]">
          Sem fotografia de capa
        </span>
        <span className="shrink-0 font-sans text-[max(0.375rem,3.4cqw)] uppercase tracking-[0.14em]">
          NEABI-NI
        </span>
      </div>
    </div>
  );
}

const TONE_PATTERN: Record<NeabiTone, string> = {
  red: "text-neabi-red",
  amber: "text-neabi-amber",
  green: "text-neabi-green",
};

const TONE_BAR: Record<NeabiTone, string> = {
  red: "bg-neabi-red",
  amber: "bg-neabi-amber",
  green: "bg-neabi-green",
};
