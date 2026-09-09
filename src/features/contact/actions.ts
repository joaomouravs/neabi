"use server";

import { prisma } from "@/lib/prisma";
import { getActor } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { logger } from "@/server/logger";
import { clientFingerprint, enforceRateLimit } from "@/server/rate-limit";
import { CONTACT_MIN_FILL_MS, contactSchema } from "@/validators/contact";

/**
 * Formulário de contato.
 *
 * Três camadas contra spam, nenhuma delas dependente de serviço externo:
 *  1. campo-armadilha invisível, que robôs tendem a preencher;
 *  2. tempo mínimo de preenchimento — envio instantâneo é automatizado;
 *  3. limite de taxa por origem.
 *
 * Nenhuma delas usa CAPTCHA, que cria barreira de acessibilidade real.
 */
export async function sendContactMessageAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const parsed = contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      website: formData.get("website") ?? "",
      renderedAt: formData.get("renderedAt") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    if (parsed.data.website && parsed.data.website.length > 0) {
      throw new ValidationError("Não foi possível enviar a mensagem.");
    }

    if (
      parsed.data.renderedAt &&
      Date.now() - parsed.data.renderedAt < CONTACT_MIN_FILL_MS
    ) {
      throw new ValidationError(
        "Aguarde um instante antes de enviar a mensagem.",
      );
    }

    enforceRateLimit({
      action: "contact",
      subject: await clientFingerprint("contact"),
      limit: 3,
      windowMs: 30 * 60 * 1000,
    });

    const actor = await getActor();

    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    logger.info("Nova mensagem de contato", {
      email: parsed.data.email,
      userId: actor?.id ?? null,
    });

    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}
