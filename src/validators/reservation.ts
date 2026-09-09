import { z } from "zod";

import { patronTypesRequiringRegistration } from "@/config/catalog";
import { PatronType, ReservationStatus, Shift } from "@/generated/prisma/enums";

import {
  cuid,
  emailSchema,
  isoDateSchema,
  optionalText,
  phoneSchema,
  requiredText,
} from "./common";

/**
 * Formulário de reserva presencial.
 *
 * Reserva ≠ empréstimo domiciliar: o pedido é de consulta/retirada presencial,
 * conforme as regras do NEABI. As regras que dependem de estado do banco
 * (disponibilidade do exemplar, dias de atendimento, limite de reservas ativas)
 * são verificadas no serviço, nunca aqui.
 */
export const reservationFormSchema = z
  .object({
    fullName: requiredText("o nome completo", 160),
    email: emailSchema,
    phone: phoneSchema,
    registrationId: optionalText(60),
    patronType: z.enum(PatronType, { error: "Selecione o tipo de usuário." }),
    requestedDate: isoDateSchema,
    shift: z.enum(Shift, { error: "Selecione um turno." }),
    purpose: z
      .string()
      .trim()
      .max(500, "A finalidade deve ter no máximo 500 caracteres.")
      .transform((value) => (value.length === 0 ? null : value))
      .nullable()
      .default(null),
    acknowledgement: z.literal(true, {
      error: "É necessário declarar a leitura das orientações.",
    }),
  })
  .refine(
    (data) =>
      !patronTypesRequiringRegistration.includes(data.patronType) ||
      (data.registrationId !== null && data.registrationId.length > 0),
    {
      path: ["registrationId"],
      error: "Informe a matrícula ou o vínculo institucional.",
    },
  );

export type ReservationFormInput = z.input<typeof reservationFormSchema>;
export type ReservationFormValues = z.output<typeof reservationFormSchema>;

/** Payload aceito pela Server Action — o livro vem da rota, não do formulário. */
export const createReservationSchema = z.object({
  bookSlug: z.string().trim().min(1).max(160),
  form: reservationFormSchema,
});

// ---------------------------------------------------------------------------
// Transições administrativas
// ---------------------------------------------------------------------------

/**
 * Estados alcançáveis a partir de cada estado. A máquina de estados vive no
 * domínio (`src/server/services/reservation-rules.ts`); aqui apenas declaramos
 * quais ações a interface administrativa pode solicitar.
 */
export const RESERVATION_ACTIONS = [
  "approve",
  "reject",
  "ready",
  "pickup",
  "return",
  "cancel",
  "expire",
] as const;

export type ReservationAction = (typeof RESERVATION_ACTIONS)[number];

export const reservationActionSchema = z.object({
  reservationId: cuid,
  action: z.enum(RESERVATION_ACTIONS),
  note: optionalText(500),
  /** Exemplar designado — obrigatório ao aprovar quando ainda não há um. */
  copyId: z.union([cuid, z.literal("")]).optional(),
});

export type ReservationActionInput = z.infer<typeof reservationActionSchema>;

export const cancelOwnReservationSchema = z.object({
  reservationId: cuid,
  reason: optionalText(300),
});

export const adminReservationFiltersSchema = z.object({
  status: z.enum(ReservationStatus).optional().catch(undefined),
  q: z.string().trim().max(160).catch("").default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type AdminReservationFilters = z.infer<
  typeof adminReservationFiltersSchema
>;
