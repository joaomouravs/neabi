import { ArrowRight, Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/layout/contact-form";
import { Container, PageHeader } from "@/components/layout/primitives";
import { shiftLabels } from "@/config/catalog";
import { getSettings } from "@/server/repositories/settings-repository";
import { WEEKDAY_LABELS } from "@/validators/settings";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a equipe do NEABI — CEFET/RJ, campus Nova Iguaçu: acervo, reservas, doações e parcerias.",
  alternates: { canonical: "/contato" },
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X",
  site: "Site institucional",
};

const FREQUENT_TOPICS = [
  {
    title: "Acompanhar uma reserva",
    body: "O status atualizado e o protocolo ficam em Minhas reservas.",
    href: "/minha-conta/reservas",
    cta: "Ver minhas reservas",
  },
  {
    title: "Encontrar uma obra",
    body: "A busca do acervo alcança título, autoria, eixo, assunto e ISBN.",
    href: "/acervo",
    cta: "Buscar no acervo",
  },
];

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

  const shifts = settings.availableShifts.map((shift) => shiftLabels[shift]).join(" e ");
  const hasDirectChannels = Boolean(settings.email || settings.phone || settings.address);

  return (
    <>
      <PageHeader
        eyebrow="Contato"
        title="Fale com o NEABI"
        breadcrumbs={[{ href: "/", label: "Início" }, { label: "Contato" }]}
        description="Dúvidas sobre o acervo, reservas, doação de obras, parcerias ou visitas ao núcleo. A mensagem chega diretamente à equipe."
      />

      <Container className="section-y-sm pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14 xl:gap-20">
          <div className="flex min-w-0 flex-col gap-8">
            <section aria-labelledby="canais-titulo">
              <h2 id="canais-titulo" className="font-display text-[1.875rem] font-bold leading-tight text-ink-900">
                Onde nos encontrar
              </h2>
              <ul className="mt-5 flex flex-col border-t border-border">
                <InfoRow icon={MapPin} label="Campus">
                  {settings.institution}
                  <br />
                  {settings.campus}
                  {settings.address ? (
                    <>
                      <br />
                      {settings.address}
                    </>
                  ) : null}
                </InfoRow>
                {serviceDays ? (
                  <InfoRow icon={Clock} label="Atendimento presencial">
                    {serviceDays}
                    {shifts ? (
                      <>
                        <br />
                        <span className="text-ink-600">Turnos: {shifts}</span>
                      </>
                    ) : null}
                  </InfoRow>
                ) : null}
                {settings.email ? (
                  <InfoRow icon={Mail} label="E-mail">
                    <a href={`mailto:${settings.email}`} className="link-underline break-all hover:text-neabi-red-700">
                      {settings.email}
                    </a>
                  </InfoRow>
                ) : null}
                {settings.phone ? (
                  <InfoRow icon={Phone} label="Telefone">
                    <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="link-underline hover:text-neabi-red-700">
                      {settings.phone}
                    </a>
                  </InfoRow>
                ) : null}
                {socialEntries.length > 0 ? (
                  <InfoRow icon={Globe} label="Redes">
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                      {socialEntries.map(([key, url]) => (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline hover:text-neabi-red-700"
                        >
                          {SOCIAL_LABELS[key] ?? key}
                          <span className="sr-only"> (abre em nova aba)</span>
                        </a>
                      ))}
                    </span>
                  </InfoRow>
                ) : null}
              </ul>

              {!hasDirectChannels ? (
                <p className="mt-5 border-l-2 border-neabi-amber bg-neabi-amber-050 px-4 py-3 text-[0.875rem] leading-relaxed text-neabi-amber-900">
                  Os canais diretos de contato ainda não foram publicados. Use o
                  formulário — a mensagem chega à equipe do núcleo.
                </p>
              ) : null}
            </section>

            <section aria-labelledby="frequentes-titulo">
              <h2 id="frequentes-titulo" className="eyebrow tracking-[0.12em] text-ink-500">
                Talvez você não precise escrever
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {FREQUENT_TOPICS.map((topic) => (
                  <li key={topic.href}>
                    <Link
                      href={topic.href}
                      className="group flex flex-col border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-card"
                    >
                      <span className="font-display text-xl font-semibold text-ink-900">{topic.title}</span>
                      <span className="mt-1 text-[0.875rem] leading-snug text-ink-600">{topic.body}</span>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-800 group-hover:text-neabi-red-700">
                        {topic.cta}
                        <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section
            aria-labelledby="mensagem-titulo"
            className="relative min-w-0 self-start overflow-hidden border border-border-strong bg-surface shadow-card"
          >
            <div aria-hidden="true" className="neabi-rule h-1 w-full" />
            <div className="p-5 sm:p-8">
              <h2 id="mensagem-titulo" className="font-display text-[1.875rem] font-bold leading-tight text-ink-900">
                Enviar mensagem
              </h2>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
                Campos marcados com asterisco são obrigatórios.
              </p>
              <div className="mt-7">
                <ContactForm />
              </div>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b border-border py-4">
      <span aria-hidden="true" className="flex size-9 items-center justify-center bg-surface-muted text-ink-700">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="eyebrow tracking-widest text-ink-500">{label}</p>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-900">{children}</p>
      </div>
    </li>
  );
}
