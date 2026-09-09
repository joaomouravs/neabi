import Link from "next/link";

import { mainNavigation } from "@/config/site";
import type { Settings } from "@/generated/prisma/client";
import { WEEKDAY_SHORT_LABELS } from "@/validators/settings";

import { NeabiMark } from "./neabi-mark";
import { Container } from "./primitives";

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  x?: string;
  site?: string;
}

const SOCIAL_LABELS: Record<keyof SocialLinks, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X",
  site: "Site institucional",
};

/**
 * Rodapé.
 *
 * Todo dado institucional vem de `Settings`. Campo em branco simplesmente não
 * é renderizado: é melhor omitir do que exibir um contato inventado.
 */
export function SiteFooter({ settings }: { settings: Settings }) {
  const social = (settings.socialLinks ?? {}) as SocialLinks;
  const socialEntries = (
    Object.entries(social) as [keyof SocialLinks, string | undefined][]
  ).filter((entry): entry is [keyof SocialLinks, string] =>
    Boolean(entry[1] && entry[1].length > 0),
  );

  const serviceDays = [...settings.serviceDays].sort((a, b) => a - b);

  return (
    <footer className="relative mt-24 overflow-hidden bg-neabi-black text-neabi-cream">
      <div
        aria-hidden="true"
        className="neabi-pattern-diamonds pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.05]"
      />
      <div aria-hidden="true" className="neabi-rule h-1.5 w-full" />

      <Container className="relative py-14">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <NeabiMark tone="dark" />
            <p className="mt-5 max-w-sm text-pretty text-[0.9375rem] leading-relaxed text-neabi-cream/70">
              Acervo de estudos afro-brasileiros e indígenas do Núcleo de Estudos
              Afro-Brasileiros e Indígenas do {settings.institution},{" "}
              {settings.campus}.
            </p>
          </div>

          <nav aria-labelledby="rodape-navegacao">
            <h2
              id="rodape-navegacao"
              className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-neabi-amber"
            >
              Navegação
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {mainNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[0.9375rem] text-neabi-cream/80 transition-colors hover:text-neabi-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/minha-conta/reservas"
                  className="text-[0.9375rem] text-neabi-cream/80 transition-colors hover:text-neabi-cream"
                >
                  Minhas reservas
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-neabi-amber">
              Contato
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-[0.9375rem] text-neabi-cream/80">
              {settings.address ? <li>{settings.address}</li> : null}
              {settings.email ? (
                <li>
                  <a
                    href={`mailto:${settings.email}`}
                    className="underline underline-offset-4 transition-colors hover:text-neabi-cream"
                  >
                    {settings.email}
                  </a>
                </li>
              ) : null}
              {settings.phone ? <li>{settings.phone}</li> : null}
              {serviceDays.length > 0 ? (
                <li className="text-neabi-cream/60">
                  Atendimento:{" "}
                  {serviceDays
                    .map((day) => WEEKDAY_SHORT_LABELS[day] ?? "")
                    .filter(Boolean)
                    .join(", ")}
                </li>
              ) : null}
            </ul>

            {socialEntries.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {socialEntries.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[0.875rem] font-medium text-neabi-cream/80 underline underline-offset-4 transition-colors hover:text-neabi-cream"
                    >
                      {SOCIAL_LABELS[key]}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-neabi-cream/15 pt-6 text-[0.8125rem] text-neabi-cream/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {settings.libraryName} — {settings.institution}, {settings.campus}.
          </p>
          <p>
            Memória, conhecimento e acesso. Acervo em catalogação permanente.
          </p>
        </div>
      </Container>
    </footer>
  );
}
