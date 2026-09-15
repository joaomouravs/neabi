import { contributorRoleShortLabels } from "@/config/catalog";
import { ContributorRole } from "@/generated/prisma/enums";

/**
 * Créditos resumidos de uma obra.
 *
 * Mostra até dois nomes do papel mais relevante presente (autoria antes de
 * organização) e indica o papel quando não é autoria — "Iolanda de Oliveira
 * (org.)" comunica algo diferente de uma autoria.
 *
 * Vive fora dos componentes porque também é usado no servidor: metadados da
 * página, sugestões da busca e referência bibliográfica.
 */
export function formatCredit(
  contributors: readonly {
    role: ContributorRole;
    person: { name: string };
  }[],
): string | null {
  if (contributors.length === 0) return null;

  const priority: ContributorRole[] = [
    ContributorRole.AUTHOR,
    ContributorRole.ORGANIZER,
    ContributorRole.EDITOR,
    ContributorRole.CONTRIBUTOR,
    ContributorRole.TRANSLATOR,
  ];

  const role = priority.find((candidate) =>
    contributors.some((contributor) => contributor.role === candidate),
  );
  if (!role) return null;

  const names = contributors
    .filter((contributor) => contributor.role === role)
    .map((contributor) => contributor.person.name);

  const shown = names.slice(0, 2).join("; ");
  const suffix = names.length > 2 ? ` e mais ${names.length - 2}` : "";
  const roleSuffix =
    role === ContributorRole.AUTHOR
      ? ""
      : ` (${contributorRoleShortLabels[role].toLowerCase()})`;

  return `${shown}${suffix}${roleSuffix}`;
}
