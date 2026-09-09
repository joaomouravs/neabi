import { z } from "zod";

import { PatronType } from "@/generated/prisma/enums";

import { emailSchema, optionalText, requiredText } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Informe a senha." })
    .min(1, "Informe a senha.")
    .max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Requisitos de senha: comprimento é o fator que mais contribui para a
 * resistência a força bruta, então exigimos 10 caracteres em vez de impor
 * regras de composição difíceis de memorizar.
 */
export const passwordSchema = z
  .string({ error: "Informe uma senha." })
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(200, "A senha deve ter no máximo 200 caracteres.");

export const registerSchema = z
  .object({
    name: requiredText("o nome completo", 160),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    patronType: z.enum(PatronType).optional(),
    registrationId: optionalText(60),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    error: "As senhas não coincidem.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  name: requiredText("o nome completo", 160),
  phone: optionalText(40),
  registrationId: optionalText(60),
  patronType: z.enum(PatronType).nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    error: "As senhas não coincidem.",
  });
