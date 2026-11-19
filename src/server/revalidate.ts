import { revalidatePath } from "next/cache";

/**
 * Regenera as páginas públicas estáticas na próxima visita.
 *
 * Início, catálogo, fichas das obras e rodapé mostram disponibilidade,
 * contagens e categorias derivadas do acervo, então qualquer mudança de obra,
 * exemplar, categoria ou reserva invalida o site público inteiro. Na escala do
 * acervo do NEABI isso é barato — cada página é refeita uma vez, quando alguém
 * a abre — e evita a classe de erro "esqueci de revalidar a página X".
 */
export function revalidatePublicPages(): void {
  revalidatePath("/", "layout");
}
