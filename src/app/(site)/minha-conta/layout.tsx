import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountNav } from "@/components/reservations/account-nav";
import { Container, NeabiRule } from "@/components/layout/primitives";
import { accountNavigation } from "@/config/site";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/server/auth/session";

/**
 * Casca da área do usuário.
 *
 * A verificação de sessão acontece no servidor, no layout — antes de qualquer
 * página filha renderizar. Nenhuma tela desta seção depende de checagem no
 * cliente para proteger seus dados.
 */
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login?callbackUrl=%2Fminha-conta");

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true },
  });

  return (
    <>
      <section className="border-b border-border bg-surface-muted">
        <Container className="py-12">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-neabi-red-600">
            Minha conta
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-tight text-ink-900">
            {user?.name ?? "Sua conta"}
          </h1>
          <NeabiRule className="mt-5" />
          {user?.email ? (
            <p className="mt-4 text-[0.9375rem] text-ink-600">{user.email}</p>
          ) : null}
        </Container>
      </section>

      <Container className="py-10 pb-24">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          <AccountNav items={[...accountNavigation]} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Container>
    </>
  );
}
