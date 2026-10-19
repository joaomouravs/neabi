import { NotFoundPage } from "@/components/layout/not-found-page";

/**
 * `notFound()` chamado numa página do site — uma obra inexistente ou
 * despublicada. Aparece dentro do cabeçalho e do rodapé do site, que já têm a
 * marca e o `<main>`.
 */
export default function SiteNotFound() {
  return <NotFoundPage embedded />;
}
