import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `tailwind-merge` com os utilitários próprios do design system.
 *
 * Sem este registro, `text-display-md` parece uma cor de texto para a
 * biblioteca, e um `text-ink-900` posterior o descarta — o título perde o
 * tamanho em silêncio.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { "text-display": ["xl", "lg", "md", "sm"] },
        "text-lede",
      ],
      shadow: [{ shadow: ["hairline", "card", "lift", "overlay"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Remove chaves com valor `undefined` — útil antes de gravar no Prisma. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/** Converte string vazia em `null`. Metadados ausentes nunca viram "". */
export function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}
