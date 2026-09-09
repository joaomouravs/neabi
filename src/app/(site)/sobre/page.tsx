import type { Metadata } from "next";
import Link from "next/link";

import {
  Container,
  NeabiRule,
  SectionHeading,
} from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/repositories/settings-repository";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "O Núcleo de Estudos Afro-Brasileiros e Indígenas do CEFET/RJ, campus Nova Iguaçu: ensino, pesquisa, extensão e a Biblioteca NEABI.",
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

export default async function AboutPage() {
  const [settings, bookCount, categoryCount] = await Promise.all([
    getSettings(),
    prisma.book.count({ where: { status: "PUBLISHED" } }),
    prisma.category.count(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-neabi-black">
        <div
          aria-hidden="true"
          className="neabi-pattern-rows pointer-events-none absolute inset-0 text-neabi-cream opacity-[0.06]"
        />
        <Container className="relative py-20 sm:py-28">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-neabi-amber">
            Sobre
          </p>
          <h1 className="mt-4 max-w-4xl text-balance font-display text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.95] text-neabi-cream">
            Núcleo de Estudos Afro-Brasileiros e Indígenas
          </h1>
          <NeabiRule className="mt-7 w-28" />
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-neabi-cream/75">
            {settings.institution} — {settings.campus}
          </p>
        </Container>
      </section>

      <Container className="py-20 sm:py-24">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div className="max-w-prose">
            <SectionHeading
              eyebrow="O NEABI"
              title="Conhecimento como reparação"
              level={2}
            />
            <div className="mt-7 space-y-5 text-[1.0625rem] leading-relaxed text-ink-800">
              <p className="text-pretty">
                Os Núcleos de Estudos Afro-Brasileiros e Indígenas existem nas
                instituições federais de ensino como espaços de articulação entre
                ensino, pesquisa e extensão em torno das relações étnico-raciais.
                São, ao mesmo tempo, lugares de estudo e de ação.
              </p>
              <p className="text-pretty">
                No {settings.institution}, {settings.campus}, o NEABI atua em um
                território marcado pela presença histórica de populações negras e
                indígenas — a Baixada Fluminense. Essa localização não é detalhe
                geográfico: ela orienta as perguntas que o núcleo faz e o acervo
                que reúne.
              </p>
              <p className="text-pretty">
                A Biblioteca NEABI organiza esse acervo e o torna acessível.
                Publicações acadêmicas, cadernos de pesquisa, cartilhas,
                inventários de patrimônio, planos nacionais e obras de referência
                convivem no mesmo catálogo, porque juntos compõem o registro de
                um campo de conhecimento.
              </p>
            </div>

            <h2 className="mt-14 font-display text-2xl font-semibold text-ink-900">
              Missão
            </h2>
            <p className="mt-3 max-w-prose text-pretty text-[1.0625rem] leading-relaxed text-ink-800">
              Contribuir para uma educação antirracista, promover a produção e a
              circulação de conhecimento sobre populações afro-brasileiras e
              indígenas, e garantir que esse conhecimento chegue a quem dele
              precisa — dentro e fora da instituição.
            </p>
          </div>

          <aside>
            <div className="border border-border-strong bg-surface">
              <div aria-hidden="true" className="neabi-rule h-1 w-full" />
              <div className="p-6">
                <h2 className="font-display text-lg font-semibold text-ink-900">
                  A biblioteca hoje
                </h2>
                <dl className="mt-5 flex flex-col gap-5">
                  <div>
                    <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-500">
                      Obras publicadas
                    </dt>
                    <dd className="mt-1 font-display text-4xl font-bold leading-none tabular-nums text-ink-900">
                      {bookCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-500">
                      Eixos temáticos
                    </dt>
                    <dd className="mt-1 font-display text-4xl font-bold leading-none tabular-nums text-ink-900">
                      {categoryCount}
                    </dd>
                  </div>
                </dl>
                <p className="mt-6 border-t border-border pt-5 text-[0.875rem] leading-relaxed text-ink-600">
                  O acervo é catalogado de forma progressiva. Obras com dados
                  bibliográficos ainda não conferidos aparecem sinalizadas — os
                  campos ficam vazios em vez de receber informação estimada.
                </p>
                <div className="mt-6">
                  <Button asChild className="w-full">
                    <Link href="/acervo">Explorar o acervo</Link>
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      <section className="border-t border-border bg-surface-muted py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Frentes de atuação"
            title="Como o núcleo trabalha"
            level={2}
          />
          <ul className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="bg-background p-6">
                <h3 className="font-display text-xl font-semibold text-ink-900">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-pretty text-[0.9375rem] leading-relaxed text-ink-600">
                  {pillar.body}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-20">
        <div className="flex flex-col items-start gap-6 border-l-2 border-neabi-red pl-6 sm:pl-8">
          <p className="max-w-2xl text-balance font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold leading-tight text-ink-900">
            O acervo cresce com a comunidade. Doações, indicações de obras e
            parcerias são bem-vindas.
          </p>
          <Button asChild size="lg">
            <Link href="/contato">Falar com o NEABI</Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
