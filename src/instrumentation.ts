/**
 * Verificação de ambiente na subida do servidor.
 *
 * Next.js executa `register()` uma vez, antes de atender a primeira
 * requisição. É o ponto certo para validar a configuração: uma variável
 * ausente vira erro imediato, com a lista do que falta, em vez de um defeito
 * que só aparece quando alguém tenta entrar na conta ou enviar um arquivo.
 *
 * Falhar aqui é deliberado. Um servidor que sobe sem segredo de sessão ou sem
 * banco parece saudável para o balanceador e engana quem está de plantão.
 */
export async function register(): Promise<void> {
  // A verificação só faz sentido no runtime Node — o Edge não enxerga o mesmo
  // conjunto de variáveis e não executa as camadas que dependem delas.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { env } = await import("@/server/env");
  const { logger } = await import("@/server/logger");

  const config = env();

  logger.info("Biblioteca NEABI iniciada", {
    ambiente: config.NODE_ENV,
    armazenamento: config.STORAGE_DRIVER,
    email: config.MAIL_DRIVER,
    limitacaoDeTaxa: config.RATE_LIMIT_ENABLED,
    // A URL do banco carrega usuário e senha: registramos apenas o host.
    banco: hostDe(config.DATABASE_URL),
  });
}

function hostDe(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(indeterminado)";
  }
}
