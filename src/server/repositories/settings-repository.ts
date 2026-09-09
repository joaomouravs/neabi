import { cache } from "react";

import { Prisma, Shift, type Settings } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const SETTINGS_ID = "default";

/** Campos graváveis das configurações — `id` e `updatedAt` são gerenciados. */
export type SettingsWriteInput = Omit<
  Prisma.SettingsUncheckedCreateInput,
  "id" | "updatedAt"
>;

/**
 * Valores usados apenas enquanto a linha de configurações não existe (primeira
 * execução, antes do seed). Não são "constantes do produto": assim que a linha
 * existe, o painel administrativo é a única fonte de verdade.
 */
const FALLBACK_WRITE: SettingsWriteInput = {
  libraryName: "Biblioteca NEABI",
  institution: "CEFET/RJ",
  campus: "Campus Nova Iguaçu",
  email: "",
  phone: "",
  address: "",
  openingHours: {},
  serviceDays: [1, 2, 3, 4, 5],
  availableShifts: [Shift.MORNING, Shift.AFTERNOON],
  reservationLeadDays: 1,
  reservationHorizonDays: 60,
  pickupDeadlineDays: 3,
  maxActiveReservations: 3,
  reservationInstructions: "",
  socialLinks: {},
};

const FALLBACK: Settings = {
  ...(FALLBACK_WRITE as unknown as Settings),
  id: SETTINGS_ID,
  updatedAt: new Date(0),
};

/**
 * Leitura memoizada por requisição: header, rodapé, formulário de reserva e
 * validação no servidor compartilham a mesma consulta.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const settings = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
  });
  return settings ?? FALLBACK;
});

export async function upsertSettings(
  data: Partial<SettingsWriteInput>,
): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { ...FALLBACK_WRITE, ...data, id: SETTINGS_ID },
    update: data,
  });
}
