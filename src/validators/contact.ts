import { z } from "zod";

import { emailSchema, requiredText } from "./common";

export const contactSchema = z.object({
  name: requiredText("o nome", 160),
  email: emailSchema,
  subject: requiredText("o assunto", 200),
  message: z
    .string({ error: "Escreva a mensagem." })
    .trim()
    .min(10, "A mensagem deve ter pelo menos 10 caracteres.")
    .max(4000, "A mensagem deve ter no máximo 4000 caracteres."),
  /**
   * Campo-armadilha: invisível para pessoas, frequentemente preenchido por
   * robôs. Precisa chegar vazio. Complementa — não substitui — o rate limiting
   * aplicado no servidor.
   */
  website: z.string().max(0, "Envio bloqueado.").optional().or(z.literal("")),
  /** Instante em que o formulário foi renderizado, em milissegundos. */
  renderedAt: z.coerce.number().int().nonnegative().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Envios abaixo deste tempo são quase certamente automatizados. */
export const CONTACT_MIN_FILL_MS = 2500;
