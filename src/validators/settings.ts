import { z } from "zod";

import { Shift } from "@/generated/prisma/enums";

import { optionalText, requiredText } from "./common";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM.");

export const openingHoursSchema = z.record(
  z.string().regex(/^[0-6]$/, "Dia da semana inválido."),
  z
    .array(z.object({ start: timeString, end: timeString }))
    .max(3),
);

export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const socialLinksSchema = z.object({
  instagram: z.string().trim().max(300).optional().or(z.literal("")),
  facebook: z.string().trim().max(300).optional().or(z.literal("")),
  youtube: z.string().trim().max(300).optional().or(z.literal("")),
  x: z.string().trim().max(300).optional().or(z.literal("")),
  site: z.string().trim().max(300).optional().or(z.literal("")),
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

/**
 * Configurações institucionais.
 *
 * Prazos e turnos são política do NEABI, não constante de código: por isso
 * ficam aqui e não espalhados por componentes.
 */
export const settingsSchema = z.object({
  libraryName: requiredText("o nome da biblioteca", 120),
  institution: requiredText("a instituição", 160),
  campus: requiredText("o campus", 160),
  email: z.string().trim().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: optionalText(400),

  serviceDays: z.array(z.coerce.number().int().min(0).max(6)).min(1, {
    error: "Selecione ao menos um dia de atendimento.",
  }),
  availableShifts: z.array(z.enum(Shift)).min(1, {
    error: "Selecione ao menos um turno.",
  }),
  openingHours: openingHoursSchema.default({}),

  reservationLeadDays: z.coerce.number().int().min(0).max(60),
  reservationHorizonDays: z.coerce.number().int().min(1).max(365),
  pickupDeadlineDays: z.coerce.number().int().min(1).max(60),
  maxActiveReservations: z.coerce.number().int().min(1).max(20),

  reservationInstructions: z.string().trim().max(4000).default(""),
  socialLinks: socialLinksSchema.default({}),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};
