import { after } from "next/server";

import type { AuditEvent, LogContext } from "@/server/logger";

/**
 * Gravação do registro de atividades (`AuditLog`).
 *
 * Só entram as ações da equipe que mudam o acervo, as contas, os arquivos, as
 * configurações ou as mensagens. Ficam de fora:
 *  - entrada e falha de login, que robôs geram aos milhares e já vão para o
 *    log da hospedagem;
 *  - criação de conta e troca de senha pela própria pessoa, que não são
 *    atos administrativos;
 *  - reservas, que têm histórico próprio (`ReservationHistory`) com quem fez
 *    cada mudança.
 */
export const PERSISTED_EVENTS: ReadonlySet<AuditEvent> = new Set<AuditEvent>([
  "acervo.obra_criada",
  "acervo.obra_atualizada",
  "acervo.obra_status",
  "acervo.obra_removida",
  "acervo.capa_removida",
  "arquivo.enviado",
  "arquivo.autorizado",
  "arquivo.removido",
  "conta.papel_alterado",
  "conta.ativacao_alterada",
  "conta.senha_redefinida",
  "configuracoes.atualizadas",
  "contato.status_alterado",
  "contato.mensagem_removida",
]);

/**
 * Agenda a gravação para depois da resposta (`after`), para que a ação da
 * equipe não espere pelo registro. Fora de uma requisição — scripts e testes —
 * `after` não existe, e a gravação segue como promessa comum.
 *
 * Uma falha aqui nunca desfaz a ação: o evento continua no log do servidor.
 */
export function persistActivity(event: AuditEvent, details: LogContext): void {
  const task = () => writeActivity(event, details);
  try {
    after(task);
  } catch {
    void task();
  }
}

async function writeActivity(event: AuditEvent, details: LogContext): Promise<void> {
  // Importação tardia: o logger é carregado por módulos que não devem puxar o
  // cliente do banco (validação de ambiente, testes unitários).
  const [{ prisma }, { logger }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/server/logger"),
  ]);
  const { actorId, ...rest } = details;
  try {
    await prisma.auditLog.create({
      data: {
        event,
        actorId: typeof actorId === "string" ? actorId : null,
        details: JSON.parse(JSON.stringify(rest)),
      },
    });
  } catch (error) {
    logger.warn("Falha ao gravar o registro de atividades", { evento: event, error });
  }
}
