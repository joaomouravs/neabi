"use server";

import { revalidatePath } from "next/cache";

import { Shift } from "@/generated/prisma/enums";
import { requirePermission } from "@/server/auth/session";
import {
  actionError,
  actionOk,
  ValidationError,
  type ActionResult,
} from "@/server/errors";
import { upsertSettings } from "@/server/repositories/settings-repository";
import { settingsSchema } from "@/validators/settings";

/**
 * Configurações institucionais.
 *
 * Restritas a ADMIN: alteram prazos, dias de atendimento e turnos, ou seja,
 * mudam as regras que o serviço de reservas aplica a todo mundo.
 */
export async function updateSettingsAction(
  _previous: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    await requirePermission("settings:manage");

    const parsed = settingsSchema.safeParse({
      libraryName: formData.get("libraryName"),
      institution: formData.get("institution"),
      campus: formData.get("campus"),
      email: formData.get("email") ?? "",
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      serviceDays: formData.getAll("serviceDays").map(String),
      availableShifts: formData.getAll("availableShifts").map(String),
      openingHours: {},
      reservationLeadDays: formData.get("reservationLeadDays"),
      reservationHorizonDays: formData.get("reservationHorizonDays"),
      pickupDeadlineDays: formData.get("pickupDeadlineDays"),
      maxActiveReservations: formData.get("maxActiveReservations"),
      reservationInstructions: formData.get("reservationInstructions") ?? "",
      socialLinks: {
        instagram: formData.get("instagram") ?? "",
        facebook: formData.get("facebook") ?? "",
        youtube: formData.get("youtube") ?? "",
        x: formData.get("x") ?? "",
        site: formData.get("site") ?? "",
      },
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue.message, String(issue.path[0] ?? ""));
    }

    const socialLinks = Object.fromEntries(
      Object.entries(parsed.data.socialLinks).filter(
        ([, value]) => typeof value === "string" && value.length > 0,
      ),
    );

    await upsertSettings({
      libraryName: parsed.data.libraryName,
      institution: parsed.data.institution,
      campus: parsed.data.campus,
      email: parsed.data.email ?? "",
      phone: parsed.data.phone ?? "",
      address: parsed.data.address ?? "",
      serviceDays: parsed.data.serviceDays,
      availableShifts: parsed.data.availableShifts as Shift[],
      reservationLeadDays: parsed.data.reservationLeadDays,
      reservationHorizonDays: parsed.data.reservationHorizonDays,
      pickupDeadlineDays: parsed.data.pickupDeadlineDays,
      maxActiveReservations: parsed.data.maxActiveReservations,
      reservationInstructions: parsed.data.reservationInstructions,
      socialLinks,
    });

    // As configurações aparecem no rodapé de todas as páginas.
    revalidatePath("/", "layout");
    revalidatePath("/admin/configuracoes");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}
