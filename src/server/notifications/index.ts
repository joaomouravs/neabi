import { formatDate } from "@/lib/date";
import { shiftLabels } from "@/config/catalog";
import type { Shift } from "@/generated/prisma/enums";

import { env } from "@/server/env";
import { logger } from "@/server/logger";

import { escapeHtml, renderReservationEmail } from "./templates";

/**
 * Notificações por e-mail.
 *
 * A arquitetura separa três coisas: o **evento** de domínio, o **template** e o
 * **transporte**. Trocar o transporte (SMTP, Resend, SES) não toca em regra de
 * negócio; hoje o padrão registra no log, o que mantém o desenvolvimento
 * previsível e sem envio acidental de mensagens reais.
 */

export type NotificationEvent =
  | "reservation_requested"
  | "reservation_approved"
  | "reservation_rejected"
  | "ready_for_pickup"
  | "reservation_cancelled"
  | "reservation_expired";

export interface ReservationNotificationPayload {
  protocol: string;
  recipientName: string;
  recipientEmail: string;
  bookTitle: string;
  bookSlug: string;
  requestedDate: Date;
  shift: Shift;
  libraryName: string;
  campus: string;
  location: string;
  note?: string | null;
  pickupDeadline?: Date | null;
  instructions?: string | null;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailTransport {
  send(message: EmailMessage): Promise<void>;
}

/** Transporte padrão: apenas registra. Nunca envia nada de fato. */
class ConsoleTransport implements MailTransport {
  async send(message: EmailMessage): Promise<void> {
    logger.info("E-mail (transporte de desenvolvimento — nada foi enviado)", {
      para: message.to,
      assunto: message.subject,
      corpo: message.text,
    });
  }
}

/**
 * Transporte SMTP.
 *
 * `nodemailer` é carregado sob demanda para não entrar no bundle quando o
 * driver configurado é `console`. Se a dependência não estiver instalada, a
 * falha é explícita em vez de silenciosa.
 */
class SmtpTransport implements MailTransport {
  async send(message: EmailMessage): Promise<void> {
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      throw new Error(
        'MAIL_DRIVER="smtp" exige a dependência `nodemailer`. Instale-a ou volte para "console".',
      );
    }

    const config = env();
    const port = config.SMTP_PORT ?? 587;
    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port,
      secure: port === 465,
      // As mensagens são só texto montado pelos templates. Nada nelas deve
      // fazer o servidor ler um arquivo do disco ou buscar uma URL — defesa
      // contra as falhas de SSRF/leitura de arquivo do nodemailer ≤ 10.0.5,
      // que não pode ser atualizado enquanto o Auth.js exigir a série 8.
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: smtpAuth(config),
    });

    await transporter.sendMail({
      from: config.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

/** Senha do SMTP: a explícita, ou a chave da integração do Resend. */
function smtpAuth(config: ReturnType<typeof env>) {
  const pass = config.SMTP_PASSWORD || config.RESEND_API_KEY;
  return config.SMTP_USER && pass ? { user: config.SMTP_USER, pass } : undefined;
}

let transport: MailTransport | null = null;

function getTransport(): MailTransport {
  if (transport) return transport;
  transport =
    env().MAIL_DRIVER === "smtp" ? new SmtpTransport() : new ConsoleTransport();
  return transport;
}

/**
 * Se as notificações saem de fato por e-mail. Com `MAIL_DRIVER="console"` elas
 * só vão para o log — e a interface não pode prometer o contrário.
 */
export function emailDeliveryEnabled(): boolean {
  return env().MAIL_DRIVER === "smtp";
}

/** Como o e-mail está configurado — o que a tela de configurações mostra. */
export function emailStatus() {
  const config = env();
  return {
    enabled: config.MAIL_DRIVER === "smtp",
    from: config.MAIL_FROM,
    host: config.SMTP_HOST ?? null,
    hasCredentials: Boolean(smtpAuth(config)),
  };
}

/**
 * Envia uma mensagem de teste pelo transporte configurado. Diferente das
 * notificações, a falha **não** é engolida: o objetivo é justamente mostrar à
 * equipe o erro real do provedor.
 */
export async function sendTestEmail(to: string, libraryName: string): Promise<void> {
  const text = [
    `Este é um e-mail de teste da ${libraryName}.`,
    "",
    "Se você o recebeu, as notificações de reserva estão saindo por e-mail.",
  ].join("\n");
  await getTransport().send({
    to,
    subject: `Teste de e-mail — ${libraryName}`,
    text,
    html: `<p>Este é um e-mail de teste da <strong>${escapeHtml(libraryName)}</strong>.</p><p>Se você o recebeu, as notificações de reserva estão saindo por e-mail.</p>`,
  });
}

/** Permite injetar um transporte falso nos testes. */
export function setMailTransport(custom: MailTransport | null): void {
  transport = custom;
}

const SUBJECTS: Record<NotificationEvent, (protocol: string) => string> = {
  reservation_requested: (p) => `Solicitação de reserva recebida — ${p}`,
  reservation_approved: (p) => `Reserva aprovada — ${p}`,
  reservation_rejected: (p) => `Solicitação de reserva não aprovada — ${p}`,
  ready_for_pickup: (p) => `Exemplar pronto para retirada — ${p}`,
  reservation_cancelled: (p) => `Reserva cancelada — ${p}`,
  reservation_expired: (p) => `Reserva expirada — ${p}`,
};

/**
 * Dispara a notificação de um evento de reserva.
 *
 * Falha de e-mail nunca desfaz a operação de negócio: a reserva já foi
 * registrada e o estado no banco é a fonte de verdade. O erro é registrado
 * para que a equipe possa reenviar.
 */
export async function notifyReservationEvent(
  event: NotificationEvent,
  payload: ReservationNotificationPayload,
): Promise<void> {
  try {
    const { html, text } = renderReservationEmail(event, {
      ...payload,
      requestedDateLabel: formatDate(payload.requestedDate),
      shiftLabel: shiftLabels[payload.shift],
      pickupDeadlineLabel: payload.pickupDeadline
        ? formatDate(payload.pickupDeadline)
        : null,
    });

    await getTransport().send({
      to: payload.recipientEmail,
      subject: SUBJECTS[event](payload.protocol),
      html,
      text,
    });
  } catch (error) {
    // Falha de e-mail não desfaz a operação de negócio, mas também não pode
    // desaparecer: sem este registro, ninguém saberia que a pessoa não foi
    // avisada de que a reserva foi aprovada.
    logger.error("Falha ao enviar notificação de reserva", {
      evento: event,
      protocolo: payload.protocol,
      error,
    });
  }
}
