import type { Metadata } from "next";
import Link from "@/components/ui/link";

import { LegalPage } from "@/components/layout/legal-page";
import { getSettings } from "@/server/repositories/settings-repository";

/**
 * Página estática, servida pelo CDN. As ações do painel que alteram o que ela
 * mostra chamam `revalidatePath`; um dia é só um teto de segurança.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Quais dados a Biblioteca NEABI-NI registra, por que e como solicitar alterações.",
  alternates: { canonical: "/privacidade" },
};

/**
 * Descreve o funcionamento real do sistema — cada item corresponde a um
 * modelo de dados existente. Nenhum prazo ou compromisso jurídico é inventado
 * aqui: esses são definidos pela instituição e preenchidos em Painel →
 * Configurações → Proteção de dados. Enquanto estiverem em branco, as seções
 * correspondentes simplesmente não aparecem.
 */
export default async function PrivacyPage() {
  const settings = await getSettings();
  const hasResponsible = Boolean(settings.dataController || settings.dpoName || settings.dpoEmail);
  const retention = settings.dataRetention
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <LegalPage
      eyebrow="Transparência"
      title="Privacidade"
      description="O que a Biblioteca NEABI-NI registra quando você consulta o acervo, cria uma conta ou solicita uma reserva — e para quê."
      updated="novembro de 2026"
      sections={[
        ...(hasResponsible
          ? [
              {
                id: "responsaveis",
                title: "Quem responde pelos dados",
                content: (
                  <ul>
                    {settings.dataController ? (
                      <li>
                        <strong>Controlador:</strong> {settings.dataController}
                      </li>
                    ) : null}
                    {settings.dpoName || settings.dpoEmail ? (
                      <li>
                        <strong>Encarregado pelo tratamento de dados (DPO):</strong>{" "}
                        {settings.dpoName}
                        {settings.dpoName && settings.dpoEmail ? " — " : null}
                        {settings.dpoEmail ? (
                          <a
                            href={`mailto:${settings.dpoEmail}`}
                            className="link-underline font-medium text-ink-900"
                          >
                            {settings.dpoEmail}
                          </a>
                        ) : null}
                      </li>
                    ) : null}
                  </ul>
                ),
              },
            ]
          : []),
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
        ...(retention.length > 0
          ? [
              {
                id: "guarda",
                title: "Por quanto tempo os dados ficam guardados",
                content: (
                  <>
                    {retention.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </>
                ),
              },
            ]
          : []),
        {
          id: "direitos",
          title: "Acesso, correção e exclusão",
          content: (
            <>
              <p>
                Em{" "}
                <Link href="/minha-conta/perfil" className="link-underline font-medium text-ink-900">
                  Minha conta → Perfil
                </Link>
                , você pode:
              </p>
              <ul>
                <li>alterar nome, telefone, vínculo e matrícula;</li>
                <li>
                  <strong>baixar uma cópia</strong> de tudo o que a Biblioteca guarda
                  associado à sua conta, num arquivo que pode ser aberto em qualquer
                  computador;
                </li>
                <li>
                  <strong>excluir a conta</strong>. Nome, e-mail, telefone, vínculo e
                  matrícula são apagados da conta e das reservas, as reservas em
                  andamento são canceladas e as mensagens enviadas pelo contato são
                  apagadas. Fica apenas o registro anônimo de que uma obra foi
                  reservada em determinada data, usado nas estatísticas do acervo.
                </li>
              </ul>
              <p>
                Quem está com um exemplar retirado precisa devolvê-lo antes de excluir
                a conta. Para outras solicitações ou dúvidas sobre o tratamento dos
                dados, escreva pelo{" "}
                <Link href="/contato" className="link-underline font-medium text-ink-900">
                  formulário de contato
                </Link>
                . O tratamento de dados segue também as normas institucionais do{" "}
                {settings.institution}.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
