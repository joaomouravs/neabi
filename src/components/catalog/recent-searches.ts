/**
 * Buscas recentes, guardadas só neste navegador.
 *
 * Apenas o texto pesquisado — nada de conta, obra aberta ou horário. O
 * armazenamento pode não existir (modo privado, bloqueio de dados do site),
 * então toda leitura e escrita falha em silêncio.
 */

const STORAGE_KEY = "neabi:buscas-recentes";
const MAX_ENTRIES = 5;

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_ENTRIES)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  const term = query.trim().slice(0, 120);
  if (term.length < 2) return;
  try {
    const current = readRecentSearches().filter(
      (entry) => entry.toLocaleLowerCase("pt-BR") !== term.toLocaleLowerCase("pt-BR"),
    );
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([term, ...current].slice(0, MAX_ENTRIES)),
    );
  } catch {
    /* armazenamento indisponível */
  }
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* armazenamento indisponível */
  }
}
