import { CopyStatus } from "@/generated/prisma/enums";

/**
 * Disponibilidade de uma obra.
 *
 * Disponibilidade física NUNCA é um campo booleano na obra: é derivada dos
 * exemplares (`PhysicalCopy`). Uma obra pode ter vários exemplares, e um
 * exemplar em manutenção ou extraviado não conta como acervo consultável.
 *
 * Disponibilidade digital só existe quando há um arquivo **autorizado**
 * cadastrado. A simples existência de um PDF não libera a consulta.
 */

export interface CopyLike {
  status: CopyStatus;
}

export interface DigitalAssetLike {
  kind: "COVER" | "PDF" | "DOCUMENT";
  authorized: boolean;
  downloadAllowed?: boolean;
}

export interface Availability {
  /** Exemplares que podem ser reservados agora. */
  availableCopies: number;
  /** Exemplares tombados no acervo, independentemente do estado. */
  totalCopies: number;
  /** Exemplares temporariamente comprometidos (reservados ou em consulta). */
  committedCopies: number;
  physicalAvailable: boolean;
  /** Existe exemplar no acervo, ainda que indisponível no momento. */
  hasPhysicalCopies: boolean;
  digitalAvailable: boolean;
  digitalDownloadAllowed: boolean;
}

/** Estados que representam um exemplar comprometido, mas presente no acervo. */
const COMMITTED: readonly CopyStatus[] = [
  CopyStatus.RESERVED,
  CopyStatus.IN_USE,
];

export function computeAvailability(
  copies: readonly CopyLike[],
  assets: readonly DigitalAssetLike[] = [],
): Availability {
  const availableCopies = copies.filter(
    (copy) => copy.status === CopyStatus.AVAILABLE,
  ).length;
  const committedCopies = copies.filter((copy) =>
    COMMITTED.includes(copy.status),
  ).length;

  const authorizedDigital = assets.filter(
    (asset) => asset.kind === "PDF" && asset.authorized,
  );

  return {
    availableCopies,
    totalCopies: copies.length,
    committedCopies,
    physicalAvailable: availableCopies > 0,
    hasPhysicalCopies: copies.length > 0,
    digitalAvailable: authorizedDigital.length > 0,
    digitalDownloadAllowed: authorizedDigital.some(
      (asset) => asset.downloadAllowed === true,
    ),
  };
}

/**
 * Texto curto de disponibilidade física, usado no card e na página da obra.
 * Distingue "sem exemplar no acervo" de "exemplar existe, mas está em uso".
 */
export function physicalAvailabilityLabel(availability: Availability): string {
  if (!availability.hasPhysicalCopies) return "Sem exemplar físico cadastrado";
  if (availability.physicalAvailable) {
    return availability.availableCopies === 1
      ? "Exemplar físico disponível"
      : `${availability.availableCopies} exemplares disponíveis`;
  }
  return "Exemplar físico em uso";
}

export function digitalAvailabilityLabel(availability: Availability): string {
  return availability.digitalAvailable
    ? "Consulta digital disponível"
    : "Material digital não disponível";
}

/** Só é possível pedir reserva quando existe exemplar livre. */
export function canRequestReservation(availability: Availability): boolean {
  return availability.physicalAvailable;
}
