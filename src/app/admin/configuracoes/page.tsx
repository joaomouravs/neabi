import { AdminPage } from "@/components/admin/admin-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePermission } from "@/server/auth/session";
import { getSettings } from "@/server/repositories/settings-repository";

export default async function AdminSettingsPage() {
  await requirePermission("settings:manage");

  const settings = await getSettings();
  const socialLinks = (settings.socialLinks ?? {}) as Record<string, string>;

  return (
    <AdminPage
      title="Configurações"
      description="Dados institucionais e regras de reserva. Estes valores são a única fonte de verdade do sistema — não existem cópias espalhadas pelo código."
    >
      <div className="max-w-4xl">
        <SettingsForm
          defaults={{
            libraryName: settings.libraryName,
            institution: settings.institution,
            campus: settings.campus,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            serviceDays: [...settings.serviceDays],
            availableShifts: [...settings.availableShifts],
            reservationLeadDays: settings.reservationLeadDays,
            reservationHorizonDays: settings.reservationHorizonDays,
            pickupDeadlineDays: settings.pickupDeadlineDays,
            maxActiveReservations: settings.maxActiveReservations,
            reservationInstructions: settings.reservationInstructions,
            socialLinks,
          }}
        />
      </div>
    </AdminPage>
  );
}
