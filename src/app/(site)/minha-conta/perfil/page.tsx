import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DeleteAccountForm, DownloadDataButton } from "@/components/reservations/account-data";
import {
  ChangePasswordForm,
  LogoutButton,
  ProfileForm,
} from "@/components/reservations/profile-forms";
import Link from "@/components/ui/link";
import { roleLabels } from "@/config/catalog";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/server/auth/session";
import { ACTIVE_STATUSES } from "@/server/services/reservation-rules";

export const metadata: Metadata = {
  title: "Perfil",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const actor = await requireActor();

  const [user, activeReservations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        name: true,
        email: true,
        phone: true,
        registrationId: true,
        patronType: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      },
    }),
    prisma.reservation.count({
      where: { userId: actor.id, status: { in: [...ACTIVE_STATUSES] } },
    }),
  ]);

  if (!user) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ProfileSection
        id="perfil-titulo"
        title="Dados pessoais"
        description="Estes dados preenchem automaticamente o formulário de reserva. Você ainda pode ajustá-los a cada solicitação."
      >
        <ProfileForm
          defaults={{
            name: user.name ?? "",
            email: user.email,
            phone: user.phone ?? "",
            registrationId: user.registrationId ?? "",
            patronType: user.patronType,
          }}
        />
      </ProfileSection>

      {user.passwordHash ? (
        <ProfileSection
          id="senha-titulo"
          title="Senha"
          description="Use pelo menos 10 caracteres. Frases longas são mais seguras e mais fáceis de lembrar."
        >
          <ChangePasswordForm />
        </ProfileSection>
      ) : null}

      <ProfileSection id="conta-titulo" title="Conta">
        <dl className="grid gap-5 text-[0.9375rem] sm:grid-cols-2">
          <div>
            <dt className="eyebrow tracking-widest text-ink-500">Perfil de acesso</dt>
            <dd className="mt-1 text-ink-800">{roleLabels[user.role]}</dd>
          </div>
          <div>
            <dt className="eyebrow tracking-widest text-ink-500">Conta criada em</dt>
            <dd className="mt-1 text-ink-800">
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeZone: "America/Sao_Paulo",
              }).format(user.createdAt)}
            </dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-border pt-5">
          <LogoutButton />
        </div>
      </ProfileSection>

      <ProfileSection
        id="dados-titulo"
        title="Seus dados"
        description="Você pode receber uma cópia de tudo o que a Biblioteca guarda sobre você ou excluir a conta."
      >
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="font-sans text-[0.9375rem] font-semibold text-ink-900">
              Cópia dos dados
            </h3>
            <p className="mt-1.5 mb-4 max-w-prose text-[0.9375rem] leading-relaxed text-ink-700">
              Um arquivo com o seu cadastro, as reservas e os seus históricos, as
              mensagens enviadas pelo contato e as buscas feitas com a sessão aberta.
            </p>
            <DownloadDataButton />
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-sans text-[0.9375rem] font-semibold text-ink-900">
              Excluir a conta
            </h3>
            {user.role === Role.MEMBER ? (
              <>
                <p className="mt-1.5 mb-4 max-w-prose text-[0.9375rem] leading-relaxed text-ink-700">
                  Apaga a conta e os seus dados pessoais. Saiba mais na{" "}
                  <Link href="/privacidade#direitos" className="link-underline font-medium text-ink-900">
                    política de privacidade
                  </Link>
                  .
                </p>
                <DeleteAccountForm
                  hasPassword={Boolean(user.passwordHash)}
                  activeReservations={activeReservations}
                />
              </>
            ) : (
              <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-ink-700">
                Contas da equipe não são excluídas por aqui. Peça a uma pessoa
                administradora que retire o seu acesso em Painel → Usuários.
              </p>
            )}
          </div>
        </div>
      </ProfileSection>
    </div>
  );
}

function ProfileSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-6 border border-border bg-surface p-5 sm:p-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12"
    >
      <div>
        <h2 id={id} className="font-display text-[1.625rem] font-bold leading-tight text-ink-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-600">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </section>
  );
}
