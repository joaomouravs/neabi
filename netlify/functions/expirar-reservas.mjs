/**
 * Expiração diária das reservas — o agendador da Netlify.
 *
 * Substitui a Vercel Cron. Todo dia às 09:00 UTC (06:00 em Nova Iguaçu, antes
 * do atendimento) chama a rota de manutenção do próprio site, que expira as
 * reservas com prazo de retirada vencido e devolve os exemplares ao acervo.
 * Sem isso, um exemplar reservado por alguém que nunca apareceu ficaria
 * indisponível para sempre.
 *
 * A regra mora na rota (`src/app/api/manutencao/expirar-reservas`), que exige
 * `CRON_SECRET`; esta função só a aciona. Funções agendadas da Netlify rodam
 * apenas no deploy publicado e têm 30 segundos de limite — de sobra.
 */
export default async function expirarReservas(_request, context) {
  const segredo = globalThis.Netlify?.env.get("CRON_SECRET") ?? process.env.CRON_SECRET;
  const site = context?.site?.url ?? process.env.URL;

  if (!segredo || !site) {
    console.error("[expirar-reservas] CRON_SECRET ou URL do site ausente: rotina não executada.");
    return new Response(null, { status: 500 });
  }

  const resposta = await fetch(new URL("/api/manutencao/expirar-reservas", site), {
    method: "POST",
    headers: { Authorization: `Bearer ${segredo}` },
  });
  const corpo = await resposta.text();
  console.log(`[expirar-reservas] ${resposta.status} ${corpo.slice(0, 200)}`);
  return new Response(null, { status: resposta.ok ? 200 : 502 });
}

export const config = { schedule: "0 9 * * *" };
