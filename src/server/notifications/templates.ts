import { siteConfig } from "@/config/site";

import type { NotificationEvent, ReservationNotificationPayload } from "./index";

/**
 * Templates de e-mail com a identidade NEABI.
 *
 * HTML de e-mail é deliberadamente conservador: tabelas, estilos inline e
 * nenhuma dependência externa. Cada mensagem também tem versão em texto puro,
 * que é o que muitos leitores acessíveis realmente apresentam.
 */

const RED = "#E63329";
const AMBER = "#F5A623";
const GREEN = "#1A7A4A";
const BLACK = "#0D0D0D";
const CREAM = "#F4EFE6";

interface RenderPayload extends ReservationNotificationPayload {
  requestedDateLabel: string;
  shiftLabel: string;
  pickupDeadlineLabel: string | null;
}

interface Copy {
  headline: string;
  lead: string;
  closing: string;
}

const COPY: Record<NotificationEvent, Copy> = {
  reservation_requested: {
    headline: "Solicitação recebida",
    lead: "Sua solicitação de reserva foi recebida e será analisada pela equipe do NEABI. Você receberá um novo aviso quando houver uma decisão.",
    closing:
      "Guarde o número de protocolo: ele identifica sua solicitação no atendimento.",
  },
  reservation_approved: {
    headline: "Reserva aprovada",
    lead: "Sua solicitação foi aprovada pela equipe do NEABI. Aguarde o aviso de que o exemplar está separado para retirada.",
    closing: "A consulta é presencial, no local e no turno indicados abaixo.",
  },
  reservation_rejected: {
    headline: "Solicitação não aprovada",
    lead: "Sua solicitação de reserva não pôde ser aprovada.",
    closing:
      "Em caso de dúvida, entre em contato com a equipe do NEABI pelos canais da biblioteca.",
  },
  ready_for_pickup: {
    headline: "Exemplar pronto para retirada",
    lead: "O exemplar solicitado está separado e disponível para consulta presencial.",
    closing: "Compareça dentro do prazo indicado para não perder a reserva.",
  },
  reservation_cancelled: {
    headline: "Reserva cancelada",
    lead: "Sua reserva foi cancelada e o exemplar voltou a ficar disponível no acervo.",
    closing: "Você pode solicitar uma nova reserva a qualquer momento.",
  },
  reservation_expired: {
    headline: "Reserva expirada",
    lead: "O prazo de retirada terminou e a reserva foi encerrada automaticamente. O exemplar voltou ao acervo.",
    closing: "Se ainda precisar da obra, faça uma nova solicitação.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;font:500 13px/1.4 Helvetica,Arial,sans-serif;color:#6B655C;width:180px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font:400 15px/1.4 Helvetica,Arial,sans-serif;color:${BLACK};">${escapeHtml(value)}</td>
    </tr>`;
}

export function renderReservationEmail(
  event: NotificationEvent,
  payload: RenderPayload,
): { html: string; text: string } {
  const copy = COPY[event];
  const bookUrl = `${siteConfig.url}/acervo/${payload.bookSlug}`;

  const details: [string, string][] = [
    ["Protocolo", payload.protocol],
    ["Obra", payload.bookTitle],
    ["Data solicitada", payload.requestedDateLabel],
    ["Turno", payload.shiftLabel],
    ["Local", payload.location],
  ];

  if (payload.pickupDeadlineLabel) {
    details.push(["Retirar até", payload.pickupDeadlineLabel]);
  }
  if (payload.note) {
    details.push(["Observação da equipe", payload.note]);
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:${CREAM};">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #E8E0D1;">
    <tr>
      <td style="height:6px;background:linear-gradient(to right, ${RED} 0 33.33%, ${AMBER} 33.33% 66.66%, ${GREEN} 66.66% 100%);"></td>
    </tr>
    <tr>
      <td style="padding:28px 32px 8px;">
        <p style="margin:0 0 4px;font:600 12px/1 Helvetica,Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase;color:${RED};">${escapeHtml(payload.libraryName)}</p>
        <h1 style="margin:0;font:700 30px/1.1 Helvetica,Arial,sans-serif;color:${BLACK};">${escapeHtml(copy.headline)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 0;">
        <p style="margin:0 0 20px;font:400 16px/1.6 Helvetica,Arial,sans-serif;color:#33302C;">${escapeHtml(payload.recipientName)}, ${escapeHtml(copy.lead)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #E8E0D1;border-bottom:1px solid #E8E0D1;padding:8px 0;">
          ${details.map(([label, value]) => row(label, value)).join("")}
        </table>
        <p style="margin:20px 0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#33302C;">${escapeHtml(copy.closing)}</p>
        ${
          payload.instructions
            ? `<div style="margin:0 0 20px;padding:16px;background:${CREAM};"><p style="margin:0;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#33302C;">${escapeHtml(payload.instructions)}</p></div>`
            : ""
        }
        <p style="margin:0 0 28px;">
          <a href="${bookUrl}" style="display:inline-block;padding:12px 20px;background:${BLACK};color:${CREAM};font:600 14px/1 Helvetica,Arial,sans-serif;text-decoration:none;">Ver a obra no acervo</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;border-top:1px solid #E8E0D1;">
        <p style="margin:16px 0 0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8D867B;">
          ${escapeHtml(payload.libraryName)} — ${escapeHtml(payload.campus)}<br>
          Esta é uma mensagem automática. Não responda a este e-mail.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    payload.libraryName.toUpperCase(),
    "",
    copy.headline,
    "",
    `${payload.recipientName}, ${copy.lead}`,
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    copy.closing,
    ...(payload.instructions ? ["", payload.instructions] : []),
    "",
    bookUrl,
    "",
    `${payload.libraryName} — ${payload.campus}`,
    "Esta é uma mensagem automática. Não responda a este e-mail.",
  ].join("\n");

  return { html, text };
}
