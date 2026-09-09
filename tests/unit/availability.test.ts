import { describe, expect, it } from "vitest";

import { CopyStatus } from "@/generated/prisma/enums";
import {
  canRequestReservation,
  computeAvailability,
  digitalAvailabilityLabel,
  physicalAvailabilityLabel,
} from "@/server/services/availability";

/**
 * Disponibilidade.
 *
 * Duas regras do produto que precisam ser inquebráveis:
 *  - disponibilidade física deriva dos exemplares, nunca de um booleano;
 *  - disponibilidade digital exige arquivo AUTORIZADO, não apenas existente.
 */

describe("disponibilidade física", () => {
  it("deriva da contagem de exemplares disponíveis", () => {
    const availability = computeAvailability([
      { status: CopyStatus.AVAILABLE },
      { status: CopyStatus.AVAILABLE },
      { status: CopyStatus.RESERVED },
    ]);

    expect(availability.availableCopies).toBe(2);
    expect(availability.totalCopies).toBe(3);
    expect(availability.committedCopies).toBe(1);
    expect(availability.physicalAvailable).toBe(true);
  });

  it("não considera disponível exemplar em manutenção, indisponível ou extraviado", () => {
    const availability = computeAvailability([
      { status: CopyStatus.MAINTENANCE },
      { status: CopyStatus.UNAVAILABLE },
      { status: CopyStatus.LOST },
    ]);

    expect(availability.availableCopies).toBe(0);
    expect(availability.physicalAvailable).toBe(false);
    // Continuam sendo exemplares do acervo, ainda que não consultáveis.
    expect(availability.hasPhysicalCopies).toBe(true);
    expect(availability.committedCopies).toBe(0);
  });

  it("distingue acervo sem exemplar de exemplar em uso", () => {
    const nenhum = computeAvailability([]);
    expect(nenhum.hasPhysicalCopies).toBe(false);
    expect(physicalAvailabilityLabel(nenhum)).toBe(
      "Sem exemplar físico cadastrado",
    );

    const emUso = computeAvailability([{ status: CopyStatus.IN_USE }]);
    expect(emUso.hasPhysicalCopies).toBe(true);
    expect(physicalAvailabilityLabel(emUso)).toBe("Exemplar físico em uso");
  });

  it("usa singular e plural corretamente", () => {
    expect(
      physicalAvailabilityLabel(computeAvailability([{ status: CopyStatus.AVAILABLE }])),
    ).toBe("Exemplar físico disponível");

    expect(
      physicalAvailabilityLabel(
        computeAvailability([
          { status: CopyStatus.AVAILABLE },
          { status: CopyStatus.AVAILABLE },
        ]),
      ),
    ).toBe("2 exemplares disponíveis");
  });

  it("só permite pedir reserva quando há exemplar livre", () => {
    expect(
      canRequestReservation(computeAvailability([{ status: CopyStatus.AVAILABLE }])),
    ).toBe(true);
    expect(
      canRequestReservation(computeAvailability([{ status: CopyStatus.RESERVED }])),
    ).toBe(false);
    expect(canRequestReservation(computeAvailability([]))).toBe(false);
  });
});

describe("disponibilidade digital", () => {
  it("é falsa quando não há arquivo algum", () => {
    const availability = computeAvailability([{ status: CopyStatus.AVAILABLE }], []);
    expect(availability.digitalAvailable).toBe(false);
    expect(digitalAvailabilityLabel(availability)).toBe(
      "Material digital não disponível",
    );
  });

  it("é falsa quando existe PDF mas ele NÃO está autorizado", () => {
    const availability = computeAvailability(
      [{ status: CopyStatus.AVAILABLE }],
      [{ kind: "PDF", authorized: false }],
    );
    expect(availability.digitalAvailable).toBe(false);
  });

  it("é verdadeira apenas com PDF autorizado", () => {
    const availability = computeAvailability(
      [{ status: CopyStatus.AVAILABLE }],
      [{ kind: "PDF", authorized: true }],
    );
    expect(availability.digitalAvailable).toBe(true);
    expect(digitalAvailabilityLabel(availability)).toBe(
      "Consulta digital disponível",
    );
  });

  it("não confunde capa com material de leitura", () => {
    const availability = computeAvailability(
      [{ status: CopyStatus.AVAILABLE }],
      [{ kind: "COVER", authorized: true }],
    );
    expect(availability.digitalAvailable).toBe(false);
  });

  it("permite download somente quando explicitamente liberado", () => {
    const semDownload = computeAvailability(
      [],
      [{ kind: "PDF", authorized: true, downloadAllowed: false }],
    );
    expect(semDownload.digitalDownloadAllowed).toBe(false);

    const comDownload = computeAvailability(
      [],
      [{ kind: "PDF", authorized: true, downloadAllowed: true }],
    );
    expect(comDownload.digitalDownloadAllowed).toBe(true);
  });
});
