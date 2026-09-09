import { z } from "zod";

/**
 * Blocos reutilizáveis de validação.
 *
 * Os mesmos schemas são usados no formulário (React Hook Form) e no servidor
 * (Server Actions / Route Handlers). Validação de cliente é conveniência de
 * interface; a decisão sempre é tomada de novo no servidor.
 */

export const cuid = z.string().min(1, "Identificador inválido.").max(64);

export const requiredText = (label: string, max = 200) =>
  z
    .string({ error: `Informe ${label}.` })
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

/** Texto opcional: string vazia é convertida em `null`, nunca em `""`. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .catch(null);

export const emailSchema = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail muito longo.")
  .pipe(z.email({ error: "Informe um e-mail válido." }))
  .transform((value) => value.toLowerCase());

/**
 * Telefone brasileiro: aceita formatação livre e valida a quantidade de
 * dígitos (10 para fixo com DDD, 11 para celular).
 */
export const phoneSchema = z
  .string({ error: "Informe o telefone." })
  .trim()
  .min(1, "Informe o telefone.")
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13;
    },
    { error: "Informe um telefone válido com DDD." },
  );

/** Ano de publicação plausível para um item bibliográfico. */
export const yearSchema = z
  .number()
  .int("Informe um ano inteiro.")
  .min(1400, "Ano fora do intervalo aceito.")
  .max(new Date().getFullYear() + 1, "Ano no futuro.");

/** Data recebida como `YYYY-MM-DD` de um `<input type="date">`. */
export const isoDateSchema = z
  .string({ error: "Selecione uma data." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione uma data válida.");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
});

/** ISBN-10 ou ISBN-13, com ou sem hífens. Não normaliza para não alterar o dado. */
export const isbnSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      const digits = value.replace(/[\s-]/g, "");
      return /^(\d{9}[\dXx]|\d{13})$/.test(digits);
    },
    { error: "ISBN deve ter 10 ou 13 dígitos." },
  );
