import { normalizeText, tokenizeQuery } from "@/lib/text";

/**
 * Relevância das sugestões da busca.
 *
 * `searchText` casa o termo em qualquer campo — inclusive no nome do eixo —,
 * e uma obra com "relações" só na categoria não pode aparecer antes de outra
 * com "relações" no título. Ordem: termo inteiro no título, todas as palavras
 * no título, todas as palavras no subtítulo ou na autoria, e só então o
 * restante. Empates mantêm a ordem recebida (por acessos).
 */
export function rankByRelevance<
  T extends {
    title: string;
    subtitle: string | null;
    contributors: readonly { person: { name: string } }[];
  },
>(books: readonly T[], query: string): T[] {
  const phrase = normalizeText(query);
  const tokens = tokenizeQuery(query);

  const score = (book: T): number => {
    const title = normalizeText(book.title);
    if (phrase && title.includes(phrase)) return 3;
    if (tokens.length > 0 && tokens.every((token) => title.includes(token))) return 2;
    const secondary = normalizeText(
      [book.subtitle ?? "", ...book.contributors.map((entry) => entry.person.name)].join(" "),
    );
    if (tokens.length > 0 && tokens.every((token) => secondary.includes(token))) return 1;
    return 0;
  };

  return books
    .map((book, index) => ({ book, index, score: score(book) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.book);
}
