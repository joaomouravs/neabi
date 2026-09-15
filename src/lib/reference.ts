import { ContributorRole } from "@/generated/prisma/enums";

/**
 * Referência bibliográfica no formato ABNT (NBR 6023), simplificado.
 *
 * Usa apenas o que está catalogado. Onde o dado não existe, aplica as
 * convenções da própria norma para informação desconhecida — `[S. l.]` (sem
 * local), `[s. n.]` (sem editora), `[s. d.]` (sem data) — em vez de estimar.
 * Como o acervo não registra local de publicação, `[S. l.]` sempre aparece.
 */

const NAME_SUFFIXES = new Set(["filho", "filha", "júnior", "junior", "neto", "neta", "sobrinho"]);

/** "Iolanda de Oliveira" → "OLIVEIRA, Iolanda de". */
export function formatAbntName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return (parts[0] ?? "").toLocaleUpperCase("pt-BR");

  let surname = parts.pop() as string;
  if (NAME_SUFFIXES.has(surname.toLocaleLowerCase("pt-BR")) && parts.length > 1) {
    surname = `${parts.pop()} ${surname}`;
  }
  return `${surname.toLocaleUpperCase("pt-BR")}, ${parts.join(" ")}`;
}

function nameList(names: string[]): string {
  // Até três responsáveis são todos citados; acima disso, o primeiro e "et al."
  if (names.length > 3) return `${formatAbntName(names[0])} et al.`;
  return names.map(formatAbntName).join("; ");
}

export interface ReferenceSource {
  title: string;
  subtitle: string | null;
  edition: string | null;
  year: number | null;
  publisher: { name: string } | null;
  institution: { name: string } | null;
  contributors: readonly { role: ContributorRole; person: { name: string } }[];
}

export function buildReference(book: ReferenceSource): string {
  const namesFor = (role: ContributorRole) =>
    book.contributors
      .filter((contributor) => contributor.role === role)
      .map((contributor) => contributor.person.name);

  const authors = namesFor(ContributorRole.AUTHOR);
  const organizers = namesFor(ContributorRole.ORGANIZER);

  let responsibility: string | null = null;
  if (authors.length > 0) {
    responsibility = nameList(authors);
  } else if (organizers.length > 0) {
    // A NBR 6023 usa "(org.)" tanto para uma quanto para várias pessoas.
    responsibility = `${nameList(organizers)} (org.)`;
  }

  const title = book.subtitle ? `${book.title}: ${book.subtitle}` : book.title;
  const publisher = book.publisher?.name ?? book.institution?.name ?? "[s. n.]";
  const imprint = `[S. l.]: ${publisher}, ${book.year ?? "[s. d.]"}.`;

  return [
    responsibility ? `${responsibility.replace(/\.$/, "")}.` : null,
    `${title}.`,
    book.edition ? `${book.edition.replace(/\.$/, "")}.` : null,
    imprint,
  ]
    .filter(Boolean)
    .join(" ");
}
