import { contactStatusLabels, copyStatusLabels, roleLabels } from "@/config/catalog";

/**
 * Frase legível para cada evento do registro de atividades.
 *
 * Função pura: recebe o evento, os detalhes gravados e os nomes atuais das
 * obras e contas citadas. Um nome que não existe mais (obra excluída, conta
 * apagada) vira uma descrição genérica — nunca um identificador cru.
 */

const ROLE_LABELS: Record<string, string> = roleLabels;

/** No feminino, concordando com "obra" — `bookStatusLabels` é masculino. */
const BOOK_STATUS_LABELS: Record<string, string> = {
  DRAFT: "rascunho",
  PUBLISHED: "publicada",
  ARCHIVED: "arquivada",
};

const CONTACT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(contactStatusLabels).map(([key, label]) => [key, label.toLowerCase()]),
);

const COPY_STATUS_LABELS: Record<string, string> = copyStatusLabels;

export interface ActivityLookups {
  books: Map<string, string>;
  users: Map<string, string>;
}

export interface ActivityDescription {
  text: string;
  /** Obra citada, quando ainda existe — a tela oferece o link para ela. */
  bookId?: string;
}

export function describeActivity(
  event: string,
  details: Record<string, unknown>,
  lookups: ActivityLookups,
): ActivityDescription {
  const str = (key: string) => (typeof details[key] === "string" ? (details[key] as string) : undefined);
  const bookId = str("bookId");
  const bookTitle = bookId ? lookups.books.get(bookId) : undefined;
  const book = bookTitle ? `“${bookTitle}”` : "uma obra";
  const withBook = (text: string): ActivityDescription => ({
    text,
    bookId: bookTitle ? bookId : undefined,
  });
  const userId = str("userId");
  const person = (userId && lookups.users.get(userId)) || "uma conta";
  const file = str("kind") === "PDF" ? "o PDF" : "a capa";

  switch (event) {
    case "acervo.obra_criada":
      return withBook(`Catalogou ${book}`);
    case "acervo.obra_atualizada":
      return withBook(`Editou a ficha de ${book}`);
    case "acervo.obra_status": {
      const status = BOOK_STATUS_LABELS[str("status") ?? ""] ?? "outra situação";
      return withBook(`Marcou ${book} como ${status}`);
    }
    case "acervo.obra_removida":
      return { text: `Excluiu a obra ${str("titulo") ? `“${str("titulo")}”` : "(título não registrado)"}` };
    case "acervo.exemplar_criado":
      return withBook(`Cadastrou o exemplar ${str("codigo") ?? ""} de ${book}`.replace("  ", " "));
    case "acervo.exemplar_alterado": {
      const de = str("de");
      const para = str("para");
      const codigo = str("codigo") ?? "";
      if (de && para && de !== para) {
        return withBook(
          `Exemplar ${codigo} de ${book}: ${COPY_STATUS_LABELS[de] ?? de} → ${COPY_STATUS_LABELS[para] ?? para}`,
        );
      }
      return withBook(`Editou o exemplar ${codigo} de ${book}`);
    }
    case "acervo.exemplar_removido":
      return withBook(`Excluiu o exemplar ${str("codigo") ?? ""} de ${book}`.replace("  ", " "));
    case "acervo.categoria_criada":
      return { text: `Criou a categoria “${str("nome") ?? ""}”` };
    case "acervo.categoria_alterada":
      return { text: `Editou a categoria “${str("nome") ?? ""}”` };
    case "acervo.categoria_removida":
      return { text: `Excluiu a categoria “${str("nome") ?? ""}”` };
    case "acervo.capa_removida":
      return withBook(`Removeu a capa de ${book}`);
    case "arquivo.enviado":
      return withBook(`Enviou ${file} de ${book}`);
    case "arquivo.removido":
      return withBook(`Excluiu ${file} de ${book}`);
    case "arquivo.autorizado":
      if (details.authorized !== true) return withBook(`Suspendeu a consulta digital de ${book}`);
      return withBook(
        details.downloadAllowed === true
          ? `Autorizou a consulta digital e o download de ${book}`
          : `Autorizou a consulta digital de ${book}`,
      );
    case "conta.papel_alterado":
      return {
        text: `Mudou o papel de ${person}: ${ROLE_LABELS[str("de") ?? ""] ?? "?"} → ${ROLE_LABELS[str("para") ?? ""] ?? "?"}`,
      };
    case "conta.ativacao_alterada":
      return { text: details.active === true ? `Reativou a conta de ${person}` : `Desativou a conta de ${person}` };
    case "conta.senha_redefinida":
      return { text: `Gerou uma senha temporária para ${person}` };
    case "configuracoes.atualizadas":
      return { text: "Alterou as configurações institucionais" };
    case "contato.status_alterado":
      return {
        text: `Marcou uma mensagem de contato como ${CONTACT_STATUS_LABELS[str("para") ?? ""] ?? "outra situação"}`,
      };
    case "contato.mensagem_removida":
      return { text: "Excluiu definitivamente uma mensagem de contato" };
    default:
      return { text: event };
  }
}
