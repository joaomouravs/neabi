"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { audit } from "@/server/logger";
import { ACTIVE_STATUSES } from "@/server/services/reservation-rules";

/**
 * Administração de usuários.
 *
 * Alterar papel e desativar contas são operações sensíveis: exigem permissões
 * exclusivas de ADMIN e trazem salvaguardas contra o erro clássico de a
 * administração remover o próprio acesso.
 */

const roleChangeSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(Role),
});

const activationSchema = z.object({
  userId: z.string().min(1, "Usuário não identificado.").max(64),
  active: z.boolean(),
});

export async function changeUserRoleAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("user:change-role");

    const parsed = roleChangeSchema.safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
    });
    if (!parsed.success) throw new ValidationError("Dados inválidos.");

    if (parsed.data.userId === actor.id && parsed.data.role !== Role.ADMIN) {
      throw new ConflictError(
        "Você não pode rebaixar o próprio acesso. Peça a outra pessoa administradora.",
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundError("Usuário não encontrado.");

    // A plataforma não pode ficar sem nenhuma pessoa administradora.
    if (target.role === Role.ADMIN && parsed.data.role !== Role.ADMIN) {
      await assertAnotherAdminExists(target.id);
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
    });

    audit("conta.papel_alterado", {
      userId: target.id,
      de: target.role,
      para: parsed.data.role,
      actorId: actor.id,
    });

    revalidatePath("/admin/usuarios");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

export async function setUserActiveAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const actor = await requirePermission("user:manage");

    const parsed = activationSchema.safeParse({
      userId: formData.get("userId"),
      active: formData.get("active") === "on",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }
    const { userId, active } = parsed.data;

    if (userId === actor.id && !active) {
      throw new ConflictError("Você não pode desativar a própria conta.");
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundError("Usuário não encontrado.");

    if (!active) {
      if (target.role === Role.ADMIN) await assertAnotherAdminExists(target.id);

      const activeReservations = await prisma.reservation.count({
        where: { userId: target.id, status: { in: [...ACTIVE_STATUSES] } },
      });
      if (activeReservations > 0) {
        throw new ConflictError(
          `Esta pessoa possui ${activeReservations} reserva(s) em andamento. Conclua ou cancele antes de desativar a conta.`,
        );
      }
    }

    await prisma.user.update({ where: { id: target.id }, data: { active } });

    audit("conta.ativacao_alterada", {
      userId: target.id,
      active,
      actorId: actor.id,
    });

    revalidatePath("/admin/usuarios");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

async function assertAnotherAdminExists(exceptId: string): Promise<void> {
  const remaining = await prisma.user.count({
    where: { role: Role.ADMIN, active: true, id: { not: exceptId } },
  });
  if (remaining === 0) {
    throw new ConflictError(
      "Esta é a última conta administradora ativa. Promova outra pessoa antes de alterá-la.",
    );
  }
}
