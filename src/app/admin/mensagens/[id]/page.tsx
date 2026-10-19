import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPage, AdminSection } from "@/components/admin/admin-ui";
import {
  ContactMessageActions,
  MarkContactMessageRead,
} from "@/components/admin/contact-message-actions";
import { MetadataList } from "@/components/layout/primitives";
import { Badge } from "@/components/ui/badge";
import { contactStatusLabels, contactStatusTone } from "@/config/catalog";
import { ContactStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/server/permissions/rbac";
import {
  findContactMessageById,
  listOtherMessagesFrom,
} from "@/server/repositories/contact-repository";

type Params = Promise<{ id: string }>;

export default async function AdminContactMessagePage({ params }: { params: Params }) {
  const [{ id }, actor] = await Promise.all([params, requirePermission("contact:read")]);

  const message = await findContactMessageById(id);
  if (!message) notFound();

  const [others, account] = await Promise.all([
    listOtherMessagesFrom(message.email, message.id),
    can(actor, "user:read:any")
      ? prisma.user.findUnique({
          where: { email: message.email },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const canManage = can(actor, "contact:manage");
  const replySubject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;
  const replyHref = `mailto:${message.email}?subject=${encodeURIComponent(replySubject)}`;

  return (
    <AdminPage
      eyebrow="Mensagem de contato"
      title={message.subject}
      description={
        <span className="flex flex-wrap items-center gap-3">
          <Badge variant={contactStatusTone[message.status]} size="sm">
            {contactStatusLabels[message.status]}
          </Badge>
          <span className="text-[0.8125rem] text-ink-500">
            Recebida em {formatDateTime(message.createdAt)}
          </span>
        </span>
      }
      breadcrumb={{ href: "/admin/mensagens", label: "Voltar para mensagens" }}
    >
      {canManage && message.status === ContactStatus.NEW ? (
        <MarkContactMessageRead messageId={message.id} />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <AdminSection title="Mensagem">
            {/* Texto livre de quem escreveu: quebras de linha preservadas,
                palavras longas (URLs) quebradas para não alargar a página. */}
            <p className="max-w-prose whitespace-pre-line wrap-break-word text-[0.9375rem] leading-relaxed text-ink-800">
              {message.message}
            </p>
          </AdminSection>

          <AdminSection title="Ações">
            <ContactMessageActions
              messageId={message.id}
              status={message.status}
              replyHref={replyHref}
              canManage={canManage}
              canDelete={can(actor, "contact:delete")}
            />
          </AdminSection>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <AdminSection title="Remetente">
            <MetadataList
              stacked
              items={[
                { label: "Nome", value: message.name },
                {
                  label: "E-mail",
                  value: (
                    <a
                      href={replyHref}
                      className="underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red"
                    >
                      {message.email}
                    </a>
                  ),
                },
                {
                  label: "Conta",
                  value: account ? (
                    <Link
                      href={`/admin/usuarios?q=${encodeURIComponent(message.email)}`}
                      className="underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red"
                    >
                      Cadastrada no site
                    </Link>
                  ) : null,
                },
              ]}
            />
          </AdminSection>

          {others.length > 0 ? (
            <AdminSection
              title="Outras mensagens"
              description="Enviadas pelo mesmo endereço de e-mail."
            >
              <ul className="flex flex-col divide-y divide-border">
                {others.map((other) => (
                  <li key={other.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link
                      href={`/admin/mensagens/${other.id}`}
                      className="line-clamp-2 text-[0.875rem] font-medium text-ink-900 underline decoration-ink-300 underline-offset-4 hover:decoration-neabi-red"
                    >
                      {other.subject}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.75rem] text-ink-500">
                      <Badge variant={contactStatusTone[other.status]} size="sm">
                        {contactStatusLabels[other.status]}
                      </Badge>
                      {formatDateTime(other.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </AdminSection>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
