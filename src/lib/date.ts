/**
 * Utilidades de data.
 *
 * O sistema raciocina em **dias de calendário** (a data desejada da reserva),
 * não em instantes. Para evitar o clássico erro de um dia a mais ou a menos,
 * datas de calendário são guardadas como meia-noite UTC e "hoje" é sempre
 * calculado no fuso da biblioteca, não no fuso do servidor.
 */

export const LIBRARY_TIME_ZONE = "America/Sao_Paulo";

/** Converte `YYYY-MM-DD` em `Date` na meia-noite UTC. */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0),
  );
  if (Number.isNaN(date.getTime())) return null;
  // Rejeita datas inexistentes como 2026-02-31, que o construtor normalizaria.
  if (date.getUTCMonth() !== Number(month) - 1) return null;
  return date;
}

/** Serializa uma data de calendário como `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Data de hoje no fuso da biblioteca, normalizada para meia-noite UTC. */
export function todayInLibraryTimeZone(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIBRARY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseISODate(parts) ?? new Date(0);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function differenceInDays(later: Date, earlier: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

/** Dia da semana (0 = domingo) da data de calendário. */
export function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

// ---------------------------------------------------------------------------
// Formatação para a interface
// ---------------------------------------------------------------------------

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: LIBRARY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Data de calendário (guardada em UTC) — formatada sem deslocamento de fuso. */
export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date);
}

/** Instante (criação, atualização) — formatado no fuso da biblioteca. */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

export function formatRelativeDays(date: Date, now: Date = new Date()): string {
  const days = differenceInDays(
    todayInLibraryTimeZone(date),
    todayInLibraryTimeZone(now),
  );
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1) return `em ${days} dias`;
  return `há ${Math.abs(days)} dias`;
}
