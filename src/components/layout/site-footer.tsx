import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { mainNavigation } from "@/config/site";
import { shiftLabels } from "@/config/catalog";
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
 * Todo dado institucional vem de `Settings`, e os eixos vêm do banco. Campo em
 * branco simplesmente não é renderizado: é melhor omitir do que exibir um
 * contato inventado.
 */
export function SiteFooter({
  settings,
  categories,
  signedIn,
}: {
  settings: Settings;
  categories: { slug: string; name: string }[];
  signedIn: boolean;
}) {
  const social = (settings.socialLinks ?? {}) as SocialLinks;
  const socialEntries = (
    Object.entries(social) as [keyof SocialLinks, string | undefined][]
  ).filter((entry): entry is [keyof SocialLinks, string] =>
    Boolean(entry[1] && entry[1].length > 0),
  );

  const serviceDays = [...settings.serviceDays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_SHORT_LABELS[day] ?? "")
    .filter(Boolean)
    .join(", ");
  const shifts = settings.availableShifts.map((shift) => shiftLabels[shift]).join(" e ");

  const year = new Date().getFullYear();

  return (
    <footer className="on-dark relative mt-auto overflow-hidden bg-neabi-black text-neabi-cream">
      <div aria-hidden="true" className="neabi-rule h-1.5 w-full" />
      <div
        aria-hidden="true"
        className="neabi-pattern-diamonds pointer-events-none absolute inset-0 top-1.5 text-neabi-cream opacity-[0.035]"
      />

      <Container className="relative pb-8 pt-14 sm:pt-16">
        <div className="grid gap-x-8 gap-y-11 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <Link href="/" aria-label="Biblioteca NEABI-NI — página inicial" className="inline-block">
              <NeabiMark tone="dark" />
            </Link>
            <p className="mt-5 max-w-sm text-pretty text-[0.9375rem] leading-relaxed text-neabi-cream/70">
              Acervo do Núcleo de Estudos Afro-Brasileiros e Indígenas do{" "}
              {settings.institution}, {settings.campus}. Memória, pesquisa e
              acesso ao conhecimento.
            </p>
            <Link
              href="/acervo"
              className="group mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-neabi-cream"
            >
              <span className="link-underline">Explorar o acervo</span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 text-neabi-amber transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </Link>
          </div>

          <FooterColumn title="Navegação" className="lg:col-span-2">
            {mainNavigation.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Acervo" className="lg:col-span-2">
            <FooterLink href="/acervo">Todas as obras</FooterLink>
            <FooterLink href="/acervo?availability=fisico">Disponíveis para reserva</FooterLink>
            {categories.slice(0, 4).map((category) => (
              <FooterLink key={category.slug} href={`/acervo?category=${category.slug}`}>
                {category.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Sua conta" className="lg:col-span-2">
            {signedIn ? (
              <FooterLink href="/minha-conta">Minha conta</FooterLink>
            ) : (
              <FooterLink href="/login">Entrar ou criar conta</FooterLink>
            )}
            <FooterLink href="/minha-conta/reservas">Minhas reservas</FooterLink>
            <FooterLink href="/minha-conta/historico">Histórico</FooterLink>
          </FooterColumn>

          <div className="lg:col-span-2">
            <FooterHeading>Contato</FooterHeading>
            <ul className="mt-4 flex flex-col gap-2.5 text-[0.9375rem] leading-snug text-neabi-cream/75">
              <li>
                {settings.institution}
                <br />
                {settings.campus}
              </li>
              {settings.address ? <li>{settings.address}</li> : null}
              {settings.email ? (
                <li>
                  <a
                    href={`mailto:${settings.email}`}
                    className="link-underline break-all text-neabi-cream/85 hover:text-neabi-cream"
                  >
                    {settings.email}
                  </a>
                </li>
              ) : null}
              {settings.phone ? <li>{settings.phone}</li> : null}
              {serviceDays ? (
                <li className="text-neabi-cream/60">
                  Atendimento: {serviceDays}
                  {shifts ? ` · ${shifts}` : ""}
                </li>
              ) : null}
              <li>
                <FooterLink href="/contato">Formulário de contato</FooterLink>
              </li>
            </ul>

            {socialEntries.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2" aria-label="Redes sociais">
                {socialEntries.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-underline text-[0.875rem] font-medium text-neabi-cream/85 hover:text-neabi-cream"
                    >
                      {SOCIAL_LABELS[key]}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-neabi-cream/15 pt-6 text-[0.8125rem] text-neabi-cream/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {settings.libraryName} · {settings.institution}, {settings.campus}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/acessibilidade" className="link-reveal hover:text-neabi-cream">
                Acessibilidade
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="link-reveal hover:text-neabi-cream">
                Privacidade
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}

function FooterHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="eyebrow text-neabi-amber">
      {children}
    </h2>
  );
}

function FooterColumn({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const id = `rodape-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <nav aria-labelledby={id} className={className}>
      <FooterHeading id={id}>{title}</FooterHeading>
      <ul className="mt-4 flex flex-col gap-2.5">
        {Array.isArray(children)
          ? children.flat().map((child, index) => <li key={index}>{child}</li>)
          : <li>{children}</li>}
      </ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="link-reveal text-[0.9375rem] text-neabi-cream/75 hover:text-neabi-cream"
    >
      {children}
    </Link>
  );
}
