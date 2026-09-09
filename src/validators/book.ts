import { z } from "zod";

import {
  BookStatus,
  CatalogingStatus,
  ContributorRole,
  CopyCondition,
  CopyStatus,
  MaterialType,
} from "@/generated/prisma/enums";

import { cuid, isbnSchema, optionalText, requiredText } from "./common";

/**
 * Catalogação de uma obra.
 *
 * Regra central: metadado ausente é `null`. Nenhum campo bibliográfico recebe
 * valor padrão inventado — nem ano, nem editora, nem ISBN, nem paginação.
 */

/**
 * Campos bibliográficos opcionais.
 *
 * Aceitam ausência da chave, string vazia ou `null` e produzem sempre `null`.
 * Nunca `""`: um metadado desconhecido tem que ficar visivelmente vazio no
 * banco, e não parecer um valor preenchido.
 */
const optionalIsbn = z
  .union([z.literal(""), z.null(), z.string().trim()])
  .optional()
  .transform((value) =>
    value === "" || value === null || value === undefined ? null : value,
  )
  .refine((value) => value === null || isbnSchema.safeParse(value).success, {
    error: "ISBN deve ter 10 ou 13 dígitos.",
  });

const optionalYear = z
  .union([z.literal(""), z.null(), z.coerce.number()])
  .optional()
  .transform((value) =>
    value === "" || value === null || value === undefined ? null : value,
  )
  .refine(
    (value) =>
      value === null ||
      (Number.isInteger(value) &&
        value >= 1400 &&
        value <= new Date().getFullYear() + 1),
    { error: "Informe um ano válido." },
  );

const optionalPages = z
  .union([z.literal(""), z.null(), z.coerce.number()])
  .optional()
  .transform((value) =>
    value === "" || value === null || value === undefined ? null : value,
  )
  .refine(
    (value) => value === null || (Number.isInteger(value) && value > 0 && value < 20_000),
    { error: "Informe um número de páginas válido." },
  );

export const contributorInputSchema = z.object({
  /** Nome da pessoa. A entidade `Person` é criada ou reaproveitada pelo serviço. */
  name: requiredText("o nome", 160),
  role: z.enum(ContributorRole).default(ContributorRole.AUTHOR),
});

export type ContributorInput = z.infer<typeof contributorInputSchema>;

export const bookFormSchema = z.object({
  title: requiredText("o título", 300),
  subtitle: optionalText(300),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "O slug deve conter apenas letras minúsculas, números e hifens.",
    )
    .optional()
    .or(z.literal("")),

  publisherName: optionalText(160),
  institutionName: optionalText(200),
  collection: optionalText(160),
  year: optionalYear,
  edition: optionalText(80),
  language: optionalText(60),
  pages: optionalPages,
  isbn: optionalIsbn,

  materialType: z.enum(MaterialType).default(MaterialType.BOOK),
  catalogingStatus: z.enum(CatalogingStatus).default(CatalogingStatus.NEEDS_REVIEW),

  description: optionalText(4000),
  summary: optionalText(1200),
  notes: optionalText(2000),

  contributors: z.array(contributorInputSchema).max(40).default([]),
  categoryIds: z.array(cuid).max(20).default([]),
  tagNames: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  subjectNames: z.array(z.string().trim().min(1).max(120)).max(30).default([]),

  status: z.enum(BookStatus).default(BookStatus.DRAFT),
  featured: z.boolean().default(false),
  coverAlt: optionalText(300),
});

export type BookFormInput = z.input<typeof bookFormSchema>;
export type BookFormValues = z.output<typeof bookFormSchema>;

export const updateBookSchema = z.object({
  id: cuid,
  data: bookFormSchema,
});

// ---------------------------------------------------------------------------
// Exemplares físicos
// ---------------------------------------------------------------------------

export const physicalCopySchema = z.object({
  bookId: cuid,
  /** Vazio faz o serviço gerar um código sequencial estável. */
  code: z.string().trim().max(60).optional().or(z.literal("")),
  /** Número de tombo: permanece `null` até o NEABI informar. */
  patrimonyCode: optionalText(60),
  location: optionalText(160),
  shelf: optionalText(60),
  condition: z.enum(CopyCondition).nullable().optional(),
  status: z.enum(CopyStatus).default(CopyStatus.AVAILABLE),
  notes: optionalText(500),
});

export type PhysicalCopyInput = z.infer<typeof physicalCopySchema>;

export const updatePhysicalCopySchema = physicalCopySchema
  .omit({ bookId: true })
  .extend({ id: cuid });

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: requiredText("o nome da categoria", 120),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "O slug deve conter apenas letras minúsculas, números e hifens.",
    )
    .optional()
    .or(z.literal("")),
  description: optionalText(500),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  featured: z.boolean().default(false),
});

export const updateCategorySchema = categorySchema.extend({ id: cuid });

// ---------------------------------------------------------------------------
// Arquivos digitais
// ---------------------------------------------------------------------------

export const digitalAssetAuthorizationSchema = z.object({
  assetId: cuid,
  /**
   * Autorização explícita de consulta digital. Sem ela, a obra continua sem
   * "Ler online" — o simples upload de um PDF não libera o acesso.
   */
  authorized: z.boolean(),
  downloadAllowed: z.boolean(),
});
