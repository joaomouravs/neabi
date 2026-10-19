import { describe, expect, it } from "vitest";

import { PatronType, Shift } from "@/generated/prisma/enums";
import { bookFormSchema } from "@/validators/book";
import {
  adminContactFiltersSchema,
  contactSchema,
  contactStatusUpdateSchema,
} from "@/validators/contact";
import { loginSchema, registerSchema } from "@/validators/auth";
import { reservationFormSchema } from "@/validators/reservation";

/**
 * Schemas de validação.
 *
 * O ponto mais delicado do produto aparece aqui: campo bibliográfico vazio tem
 * que virar `null`, nunca string vazia nem valor inventado.
 */

const validReservation = {
  fullName: "Maria da Silva",
  email: "Maria@Exemplo.ORG",
  phone: "(21) 99999-0000",
  registrationId: "",
  patronType: PatronType.VISITOR,
  requestedDate: "2026-10-15",
  shift: Shift.MORNING,
  purpose: "",
  acknowledgement: true as const,
};

describe("formulário de reserva", () => {
  it("aceita um preenchimento válido", () => {
    const result = reservationFormSchema.safeParse(validReservation);
    expect(result.success).toBe(true);
  });

  it("normaliza o e-mail para minúsculas", () => {
    const result = reservationFormSchema.parse(validReservation);
    expect(result.email).toBe("maria@exemplo.org");
  });

  it("converte campos opcionais vazios em null", () => {
    const result = reservationFormSchema.parse(validReservation);
    expect(result.registrationId).toBeNull();
    expect(result.purpose).toBeNull();
  });

  it("exige a declaração de leitura das orientações", () => {
    const result = reservationFormSchema.safeParse({
      ...validReservation,
      acknowledgement: false,
    });
    expect(result.success).toBe(false);
  });

  it("exige matrícula para estudante, professor(a) e técnico-administrativo", () => {
    for (const patronType of [
      PatronType.STUDENT,
      PatronType.PROFESSOR,
      PatronType.STAFF,
    ]) {
      const semMatricula = reservationFormSchema.safeParse({
        ...validReservation,
        patronType,
        registrationId: "",
      });
      expect(semMatricula.success).toBe(false);

      const comMatricula = reservationFormSchema.safeParse({
        ...validReservation,
        patronType,
        registrationId: "2026100123",
      });
      expect(comMatricula.success).toBe(true);
    }
  });

  it("não exige matrícula de visitante nem de comunidade externa", () => {
    for (const patronType of [
      PatronType.VISITOR,
      PatronType.EXTERNAL_COMMUNITY,
    ]) {
      const result = reservationFormSchema.safeParse({
        ...validReservation,
        patronType,
        registrationId: "",
      });
      expect(result.success).toBe(true);
    }
  });

  it("limita a finalidade a 500 caracteres", () => {
    const result = reservationFormSchema.safeParse({
      ...validReservation,
      purpose: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("recusa data em formato inválido", () => {
    const result = reservationFormSchema.safeParse({
      ...validReservation,
      requestedDate: "15/10/2026",
    });
    expect(result.success).toBe(false);
  });

  it("recusa telefone sem DDD", () => {
    const result = reservationFormSchema.safeParse({
      ...validReservation,
      phone: "99999",
    });
    expect(result.success).toBe(false);
  });
});

describe("catalogação de obra", () => {
  const minimal = { title: "Obra sem metadados" };

  it("aceita uma obra apenas com título", () => {
    const result = bookFormSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("mantém metadados desconhecidos como null — nunca inventa valor", () => {
    const result = bookFormSchema.parse(minimal);
    expect(result.year).toBeNull();
    expect(result.isbn).toBeNull();
    expect(result.pages).toBeNull();
    expect(result.subtitle).toBeNull();
    expect(result.publisherName).toBeNull();
    expect(result.institutionName).toBeNull();
    expect(result.edition).toBeNull();
    expect(result.language).toBeNull();
  });

  it("converte string vazia em null em vez de gravar ''", () => {
    const result = bookFormSchema.parse({
      ...minimal,
      subtitle: "",
      year: "",
      isbn: "",
      pages: "",
    });
    expect(result.subtitle).toBeNull();
    expect(result.year).toBeNull();
    expect(result.isbn).toBeNull();
    expect(result.pages).toBeNull();
  });

  it("marca a obra para revisão por padrão", () => {
    const result = bookFormSchema.parse(minimal);
    expect(result.catalogingStatus).toBe("NEEDS_REVIEW");
    expect(result.status).toBe("DRAFT");
  });

  it("aceita ISBN de 10 e de 13 dígitos, com ou sem hifens", () => {
    for (const isbn of ["8573591234", "9788573591234", "978-85-7359-123-4"]) {
      expect(bookFormSchema.safeParse({ ...minimal, isbn }).success).toBe(true);
    }
  });

  it("recusa ISBN com quantidade de dígitos inválida", () => {
    expect(bookFormSchema.safeParse({ ...minimal, isbn: "123" }).success).toBe(
      false,
    );
  });

  it("recusa ano fora do intervalo plausível", () => {
    expect(bookFormSchema.safeParse({ ...minimal, year: "1200" }).success).toBe(
      false,
    );
    expect(bookFormSchema.safeParse({ ...minimal, year: "3000" }).success).toBe(
      false,
    );
  });

  it("recusa slug com maiúsculas ou espaços", () => {
    expect(
      bookFormSchema.safeParse({ ...minimal, slug: "Obra Com Espaço" }).success,
    ).toBe(false);
    expect(
      bookFormSchema.safeParse({ ...minimal, slug: "obra-valida-2" }).success,
    ).toBe(true);
  });

  it("exige título", () => {
    expect(bookFormSchema.safeParse({ title: "   " }).success).toBe(false);
  });
});

describe("autenticação", () => {
  it("exige senha com pelo menos 10 caracteres no cadastro", () => {
    const base = {
      name: "Pessoa",
      email: "pessoa@exemplo.org",
      password: "curta",
      passwordConfirmation: "curta",
    };
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(
      registerSchema.safeParse({
        ...base,
        password: "senha-longa-o-suficiente",
        passwordConfirmation: "senha-longa-o-suficiente",
      }).success,
    ).toBe(true);
  });

  it("exige confirmação idêntica", () => {
    const result = registerSchema.safeParse({
      name: "Pessoa",
      email: "pessoa@exemplo.org",
      password: "senha-longa-o-suficiente",
      passwordConfirmation: "outra-coisa-diferente",
    });
    expect(result.success).toBe(false);
  });

  it("não aceita e-mail malformado no login", () => {
    expect(
      loginSchema.safeParse({ email: "não-é-email", password: "x" }).success,
    ).toBe(false);
  });
});

describe("contato", () => {
  const valid = {
    name: "Pessoa",
    email: "pessoa@exemplo.org",
    subject: "Doação de obras",
    message: "Gostaria de doar alguns livros ao acervo do núcleo.",
  };

  it("aceita mensagem válida", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("recusa mensagem curta demais", () => {
    expect(contactSchema.safeParse({ ...valid, message: "oi" }).success).toBe(
      false,
    );
  });

  it("recusa envio com o campo-armadilha preenchido", () => {
    expect(
      contactSchema.safeParse({ ...valid, website: "https://spam.exemplo" })
        .success,
    ).toBe(false);
  });

  it("filtros da caixa de mensagens caem no padrão quando inválidos", () => {
    expect(
      adminContactFiltersSchema.parse({ status: "QUALQUER", page: "-3" }),
    ).toEqual({ status: undefined, q: "", page: 1 });
    expect(
      adminContactFiltersSchema.parse({ status: "NEW", q: "  doação ", page: "2" }),
    ).toEqual({ status: "NEW", q: "doação", page: 2 });
  });

  it("triagem só aceita situações existentes", () => {
    expect(
      contactStatusUpdateSchema.safeParse({ messageId: "abc", status: "ANSWERED" })
        .success,
    ).toBe(true);
    expect(
      contactStatusUpdateSchema.safeParse({ messageId: "abc", status: "DELETED" })
        .success,
    ).toBe(false);
    expect(
      contactStatusUpdateSchema.safeParse({ messageId: "", status: "READ" })
        .success,
    ).toBe(false);
  });
});
