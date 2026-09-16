import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Quais dados a Biblioteca NEABI-NI registra, por que e como solicitar alterações.",
  alternates: { canonical: "/privacidade" },
};

/**
 * Descreve o funcionamento real do sistema — cada item corresponde a um
 * modelo de dados existente. Nenhum prazo ou compromisso jurídico é inventado
 * aqui: esses são definidos pela instituição.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Transparência"
      title="Privacidade"
      description="O que a Biblioteca NEABI-NI registra quando você consulta o acervo, cria uma conta ou solicita uma reserva — e para quê."
      updated="setembro de 2026"
      sections={[
        {
          id: "sem-conta",
          title: "Consultar o acervo sem conta",
          content: (
            <>
              <p>Pesquisar e abrir obras não exige cadastro. Nesse uso, o sistema registra:</p>
              <ul>
                <li>
                  <strong>Termos pesquisados</strong> e a quantidade de resultados, para
                  que a equipe saiba o que a comunidade procura e o acervo ainda não tem.
                </li>
                <li>
                  <strong>Visualizações de obras</strong>, identificadas por um código
                  irreversível. O endereço IP não é armazenado.
                </li>
              </ul>
              <p>
                As buscas recentes exibidas no campo de pesquisa ficam guardadas apenas
                no seu navegador e podem ser apagadas a qualquer momento pelo botão
                “Limpar”.
              </p>
            </>
          ),
        },
        {
          id: "conta",
          title: "Conta e reservas",
          content: (
            <>
              <p>Para solicitar reservas presenciais, a conta guarda:</p>
              <ul>
                <li>nome, e-mail e senha (armazenada apenas de forma cifrada);</li>
                <li>telefone, vínculo e matrícula, quando informados;</li>
                <li>
                  as solicitações de reserva, com data, turno, finalidade e o histórico
                  de mudanças de status feitas pela equipe.
                </li>
              </ul>
              <p>
                Esses dados servem para organizar o atendimento presencial e só são
                acessados pela equipe do NEABI responsável pelo acervo.
              </p>
            </>
          ),
        },
        {
          id: "contato",
          title: "Mensagens de contato",
          content: (
            <p>
              Nome, e-mail, assunto e mensagem enviados pelo formulário ficam
              disponíveis para a equipe responder. Não são usados para outra
              finalidade.
            </p>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          content: (
            <p>
              O site usa apenas cookies técnicos do sistema de login: o que mantém a
              sessão aberta e os que protegem o formulário de entrada contra
              requisições forjadas. Não há cookies de publicidade nem ferramentas de
              rastreamento de terceiros.
            </p>
          ),
        },
        {
          id: "direitos",
          title: "Correção e exclusão de dados",
          content: (
            <p>
              Nome, telefone, vínculo e matrícula podem ser alterados em{" "}
              <Link href="/minha-conta/perfil" className="link-underline font-medium text-ink-900">
                Minha conta
              </Link>
              . Para outras solicitações — como exclusão da conta ou dúvidas sobre o
              tratamento dos dados —, escreva pelo{" "}
              <Link href="/contato" className="link-underline font-medium text-ink-900">
                formulário de contato
              </Link>
              . O tratamento de dados segue também as normas institucionais do CEFET/RJ.
            </p>
          ),
        },
      ]}
    />
  );
}
