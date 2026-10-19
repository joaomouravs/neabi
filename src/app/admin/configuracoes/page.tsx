import { AdminPage, AdminSection } from "@/components/admin/admin-ui";
import { EmailSettings } from "@/components/admin/email-settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePermission } from "@/server/auth/session";
import { emailStatus } from "@/server/notifications";
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
      <div className="flex max-w-4xl flex-col gap-8">
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

        <AdminSection
          title="E-mail"
          description="Notificações de reserva para quem solicitou. Configurado por variáveis de ambiente — ver README, “E-mail”."
        >
          <EmailSettings status={emailStatus()} />
        </AdminSection>
      </div>
    </AdminPage>
  );
}
