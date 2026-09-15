import { BookOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Breadcrumbs, Container } from "@/components/layout/primitives";
import { AccountNav } from "@/components/reservations/account-nav";
import { Button } from "@/components/ui/button";
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
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login?callbackUrl=%2Fminha-conta");

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true },
  });

  const name = user?.name?.trim() ?? "";
  const firstName = name.split(/\s+/)[0] || null;
  const initial = (name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <>
      <section className="border-b border-border bg-surface-muted">
        <Container className="pt-6 sm:pt-8">
          <Breadcrumbs items={[{ href: "/", label: "Início" }, { label: "Minha conta" }]} />

          <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <span
                aria-hidden="true"
                className="relative flex size-14 shrink-0 items-center justify-center bg-neabi-black font-display text-3xl font-bold text-neabi-cream sm:size-16"
              >
                {initial}
                <span className="neabi-rule absolute inset-x-0 bottom-0 h-1" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-neabi-red-600">Minha conta</p>
                <h1 className="mt-1 truncate font-display text-display-sm font-bold text-ink-900">
                  {firstName ? `Olá, ${firstName}` : "Sua conta"}
                </h1>
                {user?.email ? (
                  <p className="mt-0.5 truncate text-[0.875rem] text-ink-600">{user.email}</p>
                ) : null}
              </div>
            </div>
            <Button asChild variant="outline" className="self-start sm:self-auto">
              <Link href="/acervo">
                <BookOpen aria-hidden="true" />
                Explorar o acervo
              </Link>
            </Button>
          </div>

          <AccountNav items={[...accountNavigation]} className="mt-7" />
        </Container>
      </section>

      <Container className="pb-24 pt-8 sm:pt-10">{children}</Container>
    </>
  );
}
