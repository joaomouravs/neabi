"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ContactStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getActor, requirePermission } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  NotFoundError,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { audit, logger } from "@/server/logger";
import { clientFingerprint, enforceRateLimit } from "@/server/rate-limit";
import { cuid } from "@/validators/common";
import {
  CONTACT_MIN_FILL_MS,
  contactSchema,
  contactStatusUpdateSchema,
} from "@/validators/contact";

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

// ---------------------------------------------------------------------------
// Caixa de mensagens do painel
// ---------------------------------------------------------------------------

/** O selo de mensagens novas vive no layout do painel, então ele também. */
function revalidateInbox(messageId?: string) {
  revalidatePath("/admin", "layout");
  if (messageId) revalidatePath(`/admin/mensagens/${messageId}`);
}

/** Triagem: marcar como lida, respondida, arquivada ou de volta como nova. */
export async function setContactStatusAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("contact:manage");

    const parsed = contactStatusUpdateSchema.safeParse({
      messageId: formData.get("messageId"),
      status: formData.get("status"),
    });
    if (!parsed.success) throw new ValidationError("Dados inválidos.");

    const current = await prisma.contactMessage.findUnique({
      where: { id: parsed.data.messageId },
      select: { status: true },
    });
    if (!current) throw new NotFoundError("Mensagem não encontrada.");

    if (current.status !== parsed.data.status) {
      await prisma.contactMessage.update({
        where: { id: parsed.data.messageId },
        data: { status: parsed.data.status },
      });
      audit("contato.status_alterado", {
        messageId: parsed.data.messageId,
        de: current.status,
        para: parsed.data.status,
        actorId: actor.id,
      });
    }

    revalidateInbox(parsed.data.messageId);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Abrir uma mensagem nova a marca como lida.
 *
 * Chamada pelo cliente depois que a página é de fato exibida — e não durante a
 * renderização, que também acontece em pré-carregamentos de link: a mensagem
 * não pode sair de "Nova" sem que alguém a tenha visto. A escrita é condicional
 * ao estado NEW, então nunca rebaixa uma mensagem já respondida ou arquivada.
 */
export async function markContactMessageReadAction(
  messageId: string,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("contact:manage");
    const id = cuid.parse(messageId);

    const { count } = await prisma.contactMessage.updateMany({
      where: { id, status: ContactStatus.NEW },
      data: { status: ContactStatus.READ },
    });
    if (count > 0) revalidateInbox(id);

    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Exclusão definitiva — o caminho para atender a um pedido de eliminação de
 * dados. Restrita à administração, como as demais exclusões irreversíveis.
 */
export async function deleteContactMessageAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("contact:delete");
    const id = cuid.safeParse(formData.get("messageId"));
    if (!id.success) throw new ValidationError("Mensagem não identificada.");

    const { count } = await prisma.contactMessage.deleteMany({
      where: { id: id.data },
    });
    if (count === 0) throw new NotFoundError("Mensagem não encontrada.");

    audit("contato.mensagem_removida", { messageId: id.data, actorId: actor.id });
    revalidateInbox();
  } catch (error) {
    return actionError(error);
  }

  // Fora do try: `redirect` sinaliza por exceção e não é uma falha.
  redirect("/admin/mensagens");
}
