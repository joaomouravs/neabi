import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Acessibilidade",
  description: "Compromisso e recursos de acessibilidade da Biblioteca NEABI.",
  alternates: { canonical: "/acessibilidade" },
};

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Compromisso"
      title="Acessibilidade"
      description="Um acervo sobre acesso ao conhecimento precisa ser acessível. Esta página descreve o que a Biblioteca NEABI oferece hoje e o que ainda tem limitações."
      updated="setembro de 2026"
      sections={[
        {
          id: "referencia",
          title: "Referência adotada",
          content: (
            <p>
              A interface é construída tendo como referência as Diretrizes de
              Acessibilidade para Conteúdo Web (WCAG) 2.2, nível AA. Isso orienta
              contraste, navegação, formulários e mensagens em todas as páginas.
            </p>
          ),
        },
        {
          id: "recursos",
          title: "Recursos disponíveis",
          content: (
            <ul>
              <li>
                <strong>Pular para o conteúdo:</strong> o primeiro item da página,
                ao pressionar Tab, leva direto ao conteúdo principal.
              </li>
              <li>
                <strong>Navegação por teclado:</strong> menus, busca, filtros,
                formulários e janelas funcionam sem mouse. A tecla <kbd>/</kbd> abre
                a busca, e Escape fecha painéis e janelas.
              </li>
              <li>
                <strong>Foco visível:</strong> o elemento em foco sempre recebe um
                contorno destacado.
              </li>
              <li>
                <strong>Contraste:</strong> textos e botões seguem a proporção
                mínima de 4,5:1; por isso o vermelho institucional aparece em tom
                mais escuro nos botões.
              </li>
              <li>
                <strong>Formulários:</strong> todo campo tem rótulo, e os erros
                aparecem junto do campo, com texto — nunca apenas por cor.
              </li>
              <li>
                <strong>Movimento reduzido:</strong> quem ativa a preferência de
                reduzir movimento no sistema operacional não vê animações.
              </li>
              <li>
                <strong>Leitores de tela:</strong> títulos hierárquicos, regiões
                nomeadas e anúncios de resultados de busca e de envio de formulários.
              </li>
            </ul>
          ),
        },
        {
          id: "limitacoes",
          title: "Limitações conhecidas",
          content: (
            <ul>
              <li>
                Ainda não há fotografia cadastrada para as capas; enquanto isso, as
                obras são representadas por fichas tipográficas com o título.
              </li>
              <li>
                Materiais digitais em PDF dependem da acessibilidade do próprio
                arquivo, que nem sempre é possível garantir em documentos antigos.
              </li>
              <li>O site ainda não oferece tradução para Libras.</li>
            </ul>
          ),
        },
        {
          id: "contato",
          title: "Encontrou uma barreira?",
          content: (
            <p>
              Conte para a equipe do NEABI pelo{" "}
              <Link href="/contato" className="link-underline font-medium text-ink-900">
                formulário de contato
              </Link>{" "}
              (assunto “Acessibilidade”). Descreva a página e o que aconteceu — isso
              ajuda a corrigir o problema.
            </p>
          ),
        },
      ]}
    />
  );
}
