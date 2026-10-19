import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import {
  can,
  canAccessAdmin,
  canCancelReservation,
  canViewReservation,
  permissionsFor,
  type Actor,
} from "@/server/permissions/rbac";

/**
 * Controle de acesso.
 *
 * Testamos tanto o que cada papel PODE quanto o que NÃO PODE — a segunda parte
 * é a que realmente protege o sistema.
 */

const admin: Actor = { id: "u-admin", role: Role.ADMIN };
const editor: Actor = { id: "u-editor", role: Role.EDITOR };
const member: Actor = { id: "u-member", role: Role.MEMBER };

describe("papel MEMBER", () => {
  it("pode reservar e acompanhar as próprias reservas", () => {
    expect(can(member, "reservation:create")).toBe(true);
    expect(can(member, "reservation:read:own")).toBe(true);
  });

  it("não pode cadastrar nem editar o acervo", () => {
    expect(can(member, "book:create")).toBe(false);
    expect(can(member, "book:update")).toBe(false);
    expect(can(member, "copy:manage")).toBe(false);
  });

  it("não pode ver ou gerenciar reservas de outras pessoas", () => {
    expect(can(member, "reservation:read:any")).toBe(false);
    expect(can(member, "reservation:manage")).toBe(false);
  });

  it("não lê as mensagens de contato de outras pessoas", () => {
    expect(can(member, "contact:read")).toBe(false);
    expect(can(member, "contact:manage")).toBe(false);
  });

  it("não acessa o painel administrativo", () => {
    expect(canAccessAdmin(member)).toBe(false);
  });
});

describe("papel EDITOR", () => {
  it("gerencia o acervo, exemplares e categorias", () => {
    expect(can(editor, "book:create")).toBe(true);
    expect(can(editor, "book:update")).toBe(true);
    expect(can(editor, "book:publish")).toBe(true);
    expect(can(editor, "copy:manage")).toBe(true);
    expect(can(editor, "category:manage")).toBe(true);
    expect(can(editor, "asset:upload")).toBe(true);
  });

  it("gerencia reservas", () => {
    expect(can(editor, "reservation:manage")).toBe(true);
    expect(can(editor, "reservation:read:any")).toBe(true);
  });

  it("lê e faz a triagem das mensagens de contato", () => {
    // A política de privacidade promete que a equipe responde as mensagens.
    expect(can(editor, "contact:read")).toBe(true);
    expect(can(editor, "contact:manage")).toBe(true);
  });

  it("NÃO realiza as configurações críticas reservadas à administração", () => {
    // Liberar consulta digital envolve direito autoral.
    expect(can(editor, "asset:authorize")).toBe(false);
    // Excluir definitivamente uma obra apaga registro do acervo.
    expect(can(editor, "book:delete")).toBe(false);
    // Alterar papéis é escalada de privilégio.
    expect(can(editor, "user:change-role")).toBe(false);
    expect(can(editor, "user:manage")).toBe(false);
    // Configurações mudam as regras aplicadas a todo mundo.
    expect(can(editor, "settings:manage")).toBe(false);
    // Apagar uma mensagem elimina dado pessoal sem volta.
    expect(can(editor, "contact:delete")).toBe(false);
  });

  it("acessa o painel administrativo", () => {
    expect(canAccessAdmin(editor)).toBe(true);
  });
});

describe("papel ADMIN", () => {
  it("tem todas as permissões", () => {
    for (const permission of permissionsFor(Role.ADMIN)) {
      expect(can(admin, permission)).toBe(true);
    }
  });

  it("inclui estritamente todas as permissões do editor", () => {
    for (const permission of permissionsFor(Role.EDITOR)) {
      expect(can(admin, permission)).toBe(true);
    }
    expect(permissionsFor(Role.ADMIN).length).toBeGreaterThan(
      permissionsFor(Role.EDITOR).length,
    );
  });
});

describe("sem autenticação", () => {
  it("nega tudo", () => {
    expect(can(null, "reservation:create")).toBe(false);
    expect(can(undefined, "book:read:any")).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
    expect(canViewReservation(null, { userId: "qualquer" })).toBe(false);
    expect(canCancelReservation(null, { userId: "qualquer" })).toBe(false);
  });
});

describe("acesso a uma reserva específica", () => {
  const reservation = { userId: member.id };

  it("a pessoa solicitante vê e cancela a própria reserva", () => {
    expect(canViewReservation(member, reservation)).toBe(true);
    expect(canCancelReservation(member, reservation)).toBe(true);
  });

  it("outra pessoa comum não vê a reserva alheia", () => {
    const outra: Actor = { id: "u-outra", role: Role.MEMBER };
    expect(canViewReservation(outra, reservation)).toBe(false);
    expect(canCancelReservation(outra, reservation)).toBe(false);
  });

  it("a equipe vê e cancela qualquer reserva", () => {
    expect(canViewReservation(editor, reservation)).toBe(true);
    expect(canCancelReservation(editor, reservation)).toBe(true);
    expect(canViewReservation(admin, reservation)).toBe(true);
  });
});
