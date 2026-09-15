import { forbidden, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { roleLabels } from "@/config/catalog";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/server/auth/session";
import { can, canAccessAdmin } from "@/server/permissions/rbac";

export const metadata = {
  title: "Painel administrativo",
  robots: { index: false, follow: false },
};

/**
 * Casca do painel.
 *
 * A autorização acontece aqui, no servidor, antes de qualquer página filha —
 * e cada Server Action verifica a permissão de novo por conta própria. Nunca
 * dependemos de o menu "não mostrar o link" como mecanismo de proteção.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login?callbackUrl=%2Fadmin");
  if (!canAccessAdmin(actor)) forbidden();

  // O contador de pendências só é consultado para quem pode ver reservas.
  const [user, pendingReservations] = await Promise.all([
    prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } }),
    can(actor, "reservation:read:any")
      ? prisma.reservation.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ]);

  return (
    <AdminShell
      user={{ name: user?.name ?? null, roleLabel: roleLabels[actor.role] }}
      pendingReservations={pendingReservations}
    >
      {children}
    </AdminShell>
  );
}
