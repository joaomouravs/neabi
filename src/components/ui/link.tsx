import NextLink from "next/link";
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink>;

/**
 * `<Link>` do projeto: o do Next, sem prefetch automático.
 *
 * Em produção o `<Link>` do Next pré-carrega toda rota cujo link aparece na
 * tela. Medido em 19/11/2026, com o build de produção:
 *
 *  - quando as páginas eram dinâmicas, uma visita à página inicial disparava
 *    40 renderizações no servidor e uma ao catálogo, 47 — o multiplicador que
 *    esgotou a cota de CPU da hospedagem e tirou o site do ar;
 *  - com as páginas públicas estáticas, cada visita ainda baixava de 12 a 28
 *    páginas que a pessoa nunca abriu (dados móveis de quem lê no celular), e
 *    ao recarregar a página o Chrome enfileirava os pedidos repetidos na trava
 *    do cache HTTP, deixando a rede presa por até 20 segundos.
 *
 * Sem prefetch, a navegação busca a página no clique — do CDN, quando ela é
 * estática. Um `prefetch` explícito continua valendo para um caso pontual.
 * Importar `next/link` diretamente é bloqueado pelo ESLint.
 */
export default function Link({ prefetch = false, ...props }: LinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
