import type { Metadata } from "next";

import { ContactForm } from "@/components/layout/contact-form";
import {
  Container,
  MetadataList,
  NeabiRule,
} from "@/components/layout/primitives";
import { shiftLabels } from "@/config/catalog";
import { getSettings } from "@/server/repositories/settings-repository";
import { WEEKDAY_LABELS } from "@/validators/settings";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a equipe do NEABI — CEFET/RJ, campus Nova Iguaçu: acervo, reservas, doações e parcerias.",
  alternates: { canonical: "/contato" },
};

export default async function ContactPage() {
  const settings = await getSettings();

  const socialLinks = (settings.socialLinks ?? {}) as Record<string, string>;
  const socialEntries = Object.entries(socialLinks).filter(
    ([, value]) => typeof value === "string" && value.length > 0,
  );

  const serviceDays = [...settings.serviceDays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .filter(Boolean)
    .join(", ");

  const shifts = settings.availableShifts
    .map((shift) => shiftLabels[shift])
    .join(", ");

  return (
    <>
      <section className="border-b border-border bg-surface-muted">
        <Container className="py-14 sm:py-16">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-neabi-red-600">
            Contato
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[0.95] text-ink-900">
            Fale com o NEABI
          </h1>
          <NeabiRule className="mt-5" />
          <p className="mt-5 max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-ink-600">
            Dúvidas sobre o acervo, reservas, doação de obras, parcerias ou
            visitas ao núcleo.
          </p>
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_340px] lg:gap-20">
          <div className="min-w-0 max-w-2xl">
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              Enviar mensagem
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">
              Todos os campos marcados com asterisco são obrigatórios.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>

          <aside>
            <div className="border border-border-strong bg-surface">
              <div aria-hidden="true" className="neabi-rule h-1 w-full" />
              <div className="p-6">
                <h2 className="font-display text-lg font-semibold text-ink-900">
                  Onde nos encontrar
                </h2>

                <div className="mt-5">
                  <MetadataList
                    items={[
                      { label: "Instituição", value: settings.institution },
                      { label: "Campus", value: settings.campus },
                      { label: "Endereço", value: settings.address || null },
                      {
                        label: "E-mail",
                        value: settings.email ? (
                          <a
                            href={`mailto:${settings.email}`}
                            className="underline underline-offset-4 hover:text-neabi-red-700"
                          >
                            {settings.email}
                          </a>
                        ) : null,
                      },
                      { label: "Telefone", value: settings.phone || null },
                      { label: "Atendimento", value: serviceDays || null },
                      { label: "Turnos", value: shifts || null },
                    ]}
                  />
                </div>

                {!settings.email && !settings.phone && !settings.address ? (
                  <p className="mt-5 border-t border-border pt-5 text-[0.875rem] leading-relaxed text-ink-600">
                    Os canais diretos de contato ainda não foram publicados. Use
                    o formulário ao lado — a mensagem chega à equipe do núcleo.
                  </p>
                ) : null}

                {socialEntries.length > 0 ? (
                  <div className="mt-6 border-t border-border pt-5">
                    <h3 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Redes
                    </h3>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {socialEntries.map(([key, url]) => (
                        <li key={key}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[0.875rem] font-medium underline underline-offset-4 hover:text-neabi-red-700"
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
