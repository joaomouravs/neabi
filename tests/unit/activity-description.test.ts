import { describe, expect, it } from "vitest";

import { describeActivity } from "@/lib/activity-description";

const lookups = {
  books: new Map([["livro-1", "Negra Sou!"]]),
  users: new Map([["conta-1", "Maria da Silva"]]),
};

describe("describeActivity", () => {
  it("cita a obra pelo título e oferece o link quando ela existe", () => {
    expect(describeActivity("acervo.obra_atualizada", { bookId: "livro-1" }, lookups)).toEqual({
      text: "Editou a ficha de “Negra Sou!”",
      bookId: "livro-1",
    });
  });

  it("não expõe identificador cru de obra que já não existe", () => {
    const result = describeActivity("acervo.obra_atualizada", { bookId: "sumiu" }, lookups);
    expect(result.text).toBe("Editou a ficha de uma obra");
    expect(result.bookId).toBeUndefined();
  });

  it("usa o título guardado no evento para uma obra excluída", () => {
    expect(
      describeActivity("acervo.obra_removida", { bookId: "x", titulo: "Vozes Negras" }, lookups).text,
    ).toBe("Excluiu a obra “Vozes Negras”");
    expect(describeActivity("acervo.obra_removida", { bookId: "x" }, lookups).text).toBe(
      "Excluiu a obra (título não registrado)",
    );
  });

  it("descreve a decisão de consulta digital com o que foi liberado", () => {
    const base = { bookId: "livro-1" };
    expect(describeActivity("arquivo.autorizado", { ...base, authorized: true }, lookups).text).toBe(
      "Autorizou a consulta digital de “Negra Sou!”",
    );
    expect(
      describeActivity("arquivo.autorizado", { ...base, authorized: true, downloadAllowed: true }, lookups)
        .text,
    ).toBe("Autorizou a consulta digital e o download de “Negra Sou!”");
    expect(describeActivity("arquivo.autorizado", { ...base, authorized: false }, lookups).text).toBe(
      "Suspendeu a consulta digital de “Negra Sou!”",
    );
  });

  it("descreve mudanças de conta com os rótulos dos papéis", () => {
    expect(
      describeActivity("conta.papel_alterado", { userId: "conta-1", de: "MEMBER", para: "EDITOR" }, lookups)
        .text,
    ).toBe("Mudou o papel de Maria da Silva: Usuário → Edição do acervo");
    expect(describeActivity("conta.ativacao_alterada", { userId: "conta-1", active: false }, lookups).text).toBe(
      "Desativou a conta de Maria da Silva",
    );
    expect(describeActivity("conta.senha_redefinida", { userId: "outra" }, lookups).text).toBe(
      "Gerou uma senha temporária para uma conta",
    );
  });

  it("concorda a situação da obra e da mensagem no feminino", () => {
    expect(describeActivity("acervo.obra_status", { bookId: "livro-1", status: "PUBLISHED" }, lookups).text).toBe(
      "Marcou “Negra Sou!” como publicada",
    );
    expect(describeActivity("contato.status_alterado", { para: "ANSWERED" }, lookups).text).toBe(
      "Marcou uma mensagem de contato como respondida",
    );
  });

  it("distingue capa e PDF", () => {
    expect(describeActivity("arquivo.removido", { bookId: "livro-1", kind: "PDF" }, lookups).text).toBe(
      "Excluiu o PDF de “Negra Sou!”",
    );
    expect(describeActivity("arquivo.enviado", { bookId: "livro-1", kind: "COVER" }, lookups).text).toBe(
      "Enviou a capa de “Negra Sou!”",
    );
  });
});
