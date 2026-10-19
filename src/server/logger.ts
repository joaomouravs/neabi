/**
 * Registro de eventos do servidor.
 *
 * Duas exigências que puxam em direções opostas: em desenvolvimento queremos
 * ler o log com o olho humano; em produção queremos consultá-lo com máquina.
 * Daí os dois formatos — texto legível e JSON por linha — atrás da mesma
 * interface.
 *
 * O que NUNCA entra no log: senha, hash de senha, token, cookie de sessão,
 * segredo e o corpo inteiro de um formulário. Não é só higiene: log costuma ser
 * o lugar menos protegido de uma infraestrutura, e um vazamento ali anula todo
 * o cuidado com autenticação. A redação é aplicada por nome de campo, e não
 * depende de quem chama lembrar de omitir.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** Campos redigidos por nome, em qualquer profundidade. */
const CAMPOS_SENSIVEIS =
  /^(password|senha|passwordHash|passwordConfirmation|token|accessToken|refreshToken|id_token|access_token|refresh_token|secret|authorization|cookie|sessionToken|apiKey|credentials?)$/i;

export type LogContext = Record<string, unknown>;

function nivelAtivo(): LogLevel | "silent" {
  const configurado = process.env.LOG_LEVEL as LogLevel | "silent" | undefined;
  if (configurado && configurado in LEVEL_ORDER) return configurado;
  if (process.env.NODE_ENV === "test") return "silent";
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Redige valores sensíveis e corta estruturas fundas.
 *
 * O limite de profundidade evita que um objeto do Prisma ou um `Request`
 * inteiro escorra para o log por descuido.
 */
function sanitizar(valor: unknown, profundidade = 0): unknown {
  if (valor === null || valor === undefined) return valor;
  if (profundidade > 4) return "[profundo]";

  if (valor instanceof Error) {
    return {
      name: valor.name,
      message: valor.message,
      // A pilha é ruído em produção e útil em desenvolvimento.
      ...(process.env.NODE_ENV === "production" ? {} : { stack: valor.stack }),
    };
  }

  if (Array.isArray(valor)) {
    return valor.slice(0, 20).map((item) => sanitizar(item, profundidade + 1));
  }

  if (typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor as object)) {
      saida[chave] = CAMPOS_SENSIVEIS.test(chave)
        ? "[redigido]"
        : sanitizar(item, profundidade + 1);
    }
    return saida;
  }

  return valor;
}

function emitir(level: LogLevel, mensagem: string, contexto?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[nivelAtivo()]) return;

  const dados = contexto ? (sanitizar(contexto) as LogContext) : undefined;
  const destino = level === "error" ? console.error : level === "warn" ? console.warn : console.info;

  if (process.env.NODE_ENV === "production") {
    destino(
      JSON.stringify({
        ts: new Date().toISOString(),
        level,
        msg: mensagem,
        ...dados,
      }),
    );
    return;
  }

  const sufixo = dados && Object.keys(dados).length > 0 ? ` ${JSON.stringify(dados)}` : "";
  destino(`[${level}] ${mensagem}${sufixo}`);
}

export const logger = {
  debug: (mensagem: string, contexto?: LogContext) => emitir("debug", mensagem, contexto),
  info: (mensagem: string, contexto?: LogContext) => emitir("info", mensagem, contexto),
  warn: (mensagem: string, contexto?: LogContext) => emitir("warn", mensagem, contexto),
  error: (mensagem: string, contexto?: LogContext) => emitir("error", mensagem, contexto),
};

/**
 * Eventos de auditoria.
 *
 * Separados do log comum porque respondem a uma pergunta diferente: não "o que
 * quebrou", e sim "quem fez o quê". São sempre registrados em nível `info`,
 * inclusive em produção, e carregam o identificador de quem agiu — nunca o
 * nome, e-mail ou qualquer dado pessoal além do necessário para a auditoria.
 */
export type AuditEvent =
  | "login.sucesso"
  | "login.falha"
  | "login.bloqueado"
  | "conta.criada"
  | "conta.senha_alterada"
  | "conta.papel_alterado"
  | "conta.ativacao_alterada"
  | "reserva.criada"
  | "reserva.transicao"
  | "acervo.obra_criada"
  | "acervo.obra_atualizada"
  | "acervo.obra_status"
  | "acervo.obra_removida"
  | "arquivo.enviado"
  | "arquivo.autorizado"
  | "arquivo.removido"
  | "acervo.capa_removida"
  | "arquivo.falha"
  | "configuracoes.atualizadas"
  | "contato.status_alterado"
  | "contato.mensagem_removida"
  | "banco.falha";

export function audit(evento: AuditEvent, contexto?: LogContext): void {
  emitir("info", `audit:${evento}`, contexto);
}
