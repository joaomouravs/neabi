import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Container,
  Eyebrow,
  NeabiRule,
  PageHeader,
} from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPublicCatalogStats } from "@/server/repositories/book-repository";
import { getSettings } from "@/server/repositories/settings-repository";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "O Núcleo de Estudos Afro-Brasileiros e Indígenas do CEFET/RJ, campus Nova Iguaçu: ensino, pesquisa, extensão e a Biblioteca NEABI-NI.",
  alternates: { canonical: "/sobre" },
};

const PILLARS = [
  {
    title: "Educação",
    body: "Apoio à implementação das Leis 10.639/2003 e 11.645/2008, que tornaram obrigatório o ensino de história e cultura afro-brasileira, africana e indígena na educação básica. O núcleo acompanha a formação docente e a construção de práticas pedagógicas antirracistas.",
  },
  {
    title: "Pesquisa",
    body: "Produção e circulação de conhecimento sobre relações étnico-raciais, desigualdade, território e ancestralidade — com atenção especial à Baixada Fluminense e às comunidades que a constituem.",
  },
  {
    title: "Extensão",
    body: "Ações que atravessam os muros da instituição: rodas de conversa, formações, parcerias com escolas, coletivos, terreiros e movimentos sociais da região.",
  },
  {
    title: "Memória",
    body: "Guarda e organização de materiais que registram trajetórias, lutas e saberes de populações negras e indígenas — documentos, publicações institucionais, cadernos de pesquisa e obras de referência.",
  },
  {
    title: "Cultura",
    body: "Reconhecimento das expressões culturais afro-brasileiras e indígenas como conhecimento, e não como folclore: religiosidades, oralidade, literatura, arte e linguagem.",
  },
  {
    title: "Biblioteca",
    body: "O acervo físico reunido pelo núcleo, aberto à consulta presencial da comunidade acadêmica e da comunidade externa, catalogado de forma progressiva e transparente.",
  },
];

const LAWS = [
  {
    number: "10.639/2003",
    body: "Torna obrigatório o ensino de história e cultura afro-brasileira e africana na educação básica.",
  },
  {
    number: "11.645/2008",
    body: "Amplia a obrigatoriedade para incluir a história e a cultura dos povos indígenas.",
  },
];

const PILLAR_ACCENTS = ["border-t-neabi-red", "border-t-neabi-amber", "border-t-neabi-green"];

export default async function AboutPage() {
  const [settings, stats] = await Promise.all([getSettings(), getPublicCatalogStats()]);

  return (
    <>
      <PageHeader
        tone="dark"
        eyebrow="Sobre o núcleo"
        title="Núcleo de Estudos Afro-Brasileiros e Indígenas"
        breadcrumbs={[{ href: "/", label: "Início" }, { label: "Sobre" }]}
        description={`${settings.institution} — ${settings.campus}. Ensino, pesquisa, extensão e um acervo aberto à comunidade.`}
      >
        <dl className="grid grid-cols-3 gap-6 border-t border-neabi-cream/15 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          {[
            { value: stats.books, label: stats.books === 1 ? "obra" : "obras" },
            { value: stats.categories, label: stats.categories === 1 ? "eixo" : "eixos" },
            { value: stats.totalCopies, label: stats.totalCopies === 1 ? "exemplar" : "exemplares" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col-reverse gap-1">
              <dt className="text-[0.8125rem] text-neabi-cream/65">{item.label}</dt>
              <dd className="font-display text-[2.5rem] font-bold leading-none tabular-nums text-neabi-cream">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      {/* Conhecimento como reparação */}
      <section aria-labelledby="reparacao-titulo" className="section-y">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--header-height-compact)+2rem)]">
              <Eyebrow>O NEABI</Eyebrow>
              <h2
                id="reparacao-titulo"
                className="mt-4 text-balance font-display text-display-md font-bold text-ink-900"
              >
                Conhecimento como reparação
              </h2>
              <NeabiRule className="mt-6" />
            </div>
          </div>

          <div className="max-w-[42rem] lg:col-span-8 lg:col-start-5">
            <div className="space-y-5 text-pretty text-lede text-ink-800">
              <p>
                Os Núcleos de Estudos Afro-Brasileiros e Indígenas existem nas
                instituições federais de ensino como espaços de articulação entre
                ensino, pesquisa e extensão em torno das relações étnico-raciais.
                São, ao mesmo tempo, lugares de estudo e de ação.
              </p>
              <p>
                No {settings.institution}, {settings.campus}, o NEABI atua em um
                território marcado pela presença histórica de populações negras e
                indígenas — a Baixada Fluminense.
              </p>
            </div>

            <figure className="my-10 border-l-4 border-neabi-red py-1 pl-6 sm:my-12 sm:pl-8">
              <blockquote>
                <p className="text-balance font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-semibold leading-[1.08] text-ink-900">
                  Essa localização não é detalhe geográfico: ela orienta as perguntas
                  que o núcleo faz e o acervo que reúne.
                </p>
              </blockquote>
            </figure>

            <div className="space-y-5 text-pretty text-lede text-ink-800">
              <p>
                A Biblioteca NEABI-NI organiza esse acervo e o torna acessível.
                Publicações acadêmicas, cadernos de pesquisa, cartilhas, inventários
                de patrimônio, planos nacionais e obras de referência convivem no
                mesmo catálogo, porque juntos compõem o registro de um campo de
                conhecimento.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Missão */}
      <section
        aria-labelledby="missao-titulo"
        className="section-y relative overflow-hidden border-y border-border bg-surface-muted"
      >
        <div
          aria-hidden="true"
          className="neabi-pattern-lines pointer-events-none absolute inset-y-0 right-0 w-1/2 text-ink-900 opacity-[0.04] [mask-image:linear-gradient(to_left,black,transparent)]"
        />
        <Container className="relative grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-3">
            <h2 id="missao-titulo" className="eyebrow text-neabi-red-600">
              Missão
            </h2>
          </div>
          <p className="max-w-4xl text-balance font-display text-[clamp(1.875rem,4vw,3rem)] font-semibold leading-[1.06] text-ink-900 lg:col-span-9">
            Contribuir para uma educação antirracista, promover a produção e a
            circulação de conhecimento sobre populações afro-brasileiras e indígenas
            e garantir que esse conhecimento chegue a quem dele precisa — dentro e
            fora da instituição.
          </p>
        </Container>
      </section>

      {/* Como o núcleo trabalha */}
      <section aria-labelledby="frentes-titulo" className="section-y">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>Frentes de atuação</Eyebrow>
              <h2
                id="frentes-titulo"
                className="mt-4 text-balance font-display text-display-md font-bold text-ink-900"
              >
                Como o núcleo trabalha
              </h2>
            </div>
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-ink-600">
              Seis frentes que se alimentam: a pesquisa informa a formação, a
              extensão traz perguntas da comunidade, a biblioteca guarda o que fica.
            </p>
          </div>

          <ol className="mt-10 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <li
                key={pillar.title}
                className={cn(
                  "border-t-2 pb-8 pt-6",
                  PILLAR_ACCENTS[index % PILLAR_ACCENTS.length],
                )}
              >
                <p aria-hidden="true" className="font-sans text-[0.75rem] font-semibold tabular-nums text-ink-500">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-[1.75rem] font-bold leading-tight text-ink-900">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-pretty text-[0.9375rem] leading-relaxed text-ink-600">
                  {pillar.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Marcos legais */}
      <section aria-labelledby="leis-titulo" className="on-dark relative overflow-hidden bg-neabi-black text-neabi-cream">
        <div
          aria-hidden="true"
          className="neabi-pattern pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.045]"
        />
        <Container className="section-y relative grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <Eyebrow tone="dark">Marcos legais</Eyebrow>
            <h2 id="leis-titulo" className="mt-4 text-balance font-display text-display-sm font-bold">
              A lei que o acervo ajuda a cumprir
            </h2>
          </div>
          <dl className="grid gap-8 sm:grid-cols-2 lg:col-span-8">
            {LAWS.map((law) => (
              <div key={law.number} className="border-t border-neabi-cream/20 pt-6">
                <dt className="font-display text-[clamp(2.5rem,5vw,3.5rem)] font-bold leading-none tabular-nums text-neabi-amber">
                  <span className="sr-only">Lei </span>
                  {law.number}
                </dt>
                <dd className="mt-3 max-w-sm text-[1rem] leading-relaxed text-neabi-cream/80">
                  {law.body}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Chamada final */}
      <section aria-labelledby="comunidade-titulo" className="section-y">
        <Container>
          <div className="grid gap-8 border border-border-strong bg-surface p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
            <div>
              <h2
                id="comunidade-titulo"
                className="max-w-2xl text-balance font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-tight text-ink-900"
              >
                O acervo cresce com a comunidade.
              </h2>
              <p className="mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-ink-600">
                Doações, indicações de obras e parcerias são bem-vindas. Fale com a
                equipe ou comece explorando o que já está catalogado.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild size="lg">
                <Link href="/contato">
                  Falar com o NEABI
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/acervo">Explorar o acervo</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
