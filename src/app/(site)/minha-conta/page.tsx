import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
    <div className="flex flex-col gap-14">
      <section aria-labelledby="perfil-titulo">
        <h2
          id="perfil-titulo"
          className="font-display text-2xl font-semibold text-ink-900"
        >
          Perfil
        </h2>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-600">
          Estes dados preenchem automaticamente o formulário de reserva. Você
          ainda pode ajustá-los a cada solicitação.
        </p>

        <div className="mt-7 max-w-xl">
          <ProfileForm
            defaults={{
              name: user.name ?? "",
              email: user.email,
              phone: user.phone ?? "",
              registrationId: user.registrationId ?? "",
              patronType: user.patronType,
            }}
          />
        </div>
      </section>

      {user.passwordHash ? (
        <section
          aria-labelledby="senha-titulo"
          className="border-t border-border pt-12"
        >
          <h2
            id="senha-titulo"
            className="font-display text-2xl font-semibold text-ink-900"
          >
            Senha
          </h2>
          <div className="mt-7 max-w-xl">
            <ChangePasswordForm />
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="conta-titulo"
        className="border-t border-border pt-12"
      >
        <h2
          id="conta-titulo"
          className="font-display text-2xl font-semibold text-ink-900"
        >
          Conta
        </h2>
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 text-[0.9375rem]">
          <div>
            <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-500">
              Perfil de acesso
            </dt>
            <dd className="mt-0.5 text-ink-800">{roleLabels[user.role]}</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-500">
              Conta criada em
            </dt>
            <dd className="mt-0.5 text-ink-800">
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeZone: "America/Sao_Paulo",
              }).format(user.createdAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
