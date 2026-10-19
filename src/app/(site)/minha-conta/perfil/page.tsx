import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  ChangePasswordForm,
  LogoutButton,
  ProfileForm,
} from "@/components/reservations/profile-forms";
import { roleLabels } from "@/config/catalog";
import { prisma } from "@/lib/prisma";
import { requireActor } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Perfil",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const actor = await requireActor();

  const user = await prisma.user.findUnique({
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
  });

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
