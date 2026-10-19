"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  Field,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import {
  bookStatusLabels,
  catalogingStatusLabels,
  contributorRoleLabels,
  materialTypeLabels,
} from "@/config/catalog";
import { createBookAction, updateBookAction } from "@/features/books/actions";
import {
  BookStatus,
  CatalogingStatus,
  ContributorRole,
  MaterialType,
} from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/utils";

type State = ActionResult<{ id: string; slug: string }> | null;

export interface BookFormContributor {
  name: string;
  role: ContributorRole;
}

export interface BookFormValuesInput {
  id?: string;
  title: string;
  subtitle: string;
  slug: string;
  publisherName: string;
  institutionName: string;
  collection: string;
  year: string;
  edition: string;
  language: string;
  pages: string;
  isbn: string;
  materialType: MaterialType;
  catalogingStatus: CatalogingStatus;
  description: string;
  summary: string;
  notes: string;
  contributors: BookFormContributor[];
  categoryIds: string[];
  tagNames: string;
  subjectNames: string;
  status: BookStatus;
  featured: boolean;
  coverAlt: string;
}

const SECTIONS = [
  { id: "basicos", label: "Informações básicas" },
  { id: "classificacao", label: "Classificação" },
  { id: "descricao", label: "Descrição" },
  { id: "publicacao", label: "Publicação" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Formulário de catalogação.
 *
 * Princípio que atravessa todo o formulário: **campo em branco é campo em
 * branco**. Nada aqui sugere, completa ou estima ano, ISBN, editora ou
 * paginação. Quem cataloga registra o que está no exemplar — o resto fica
 * vazio e a obra permanece marcada para revisão.
 */
export function BookForm({
  mode,
  defaults,
  categories,
}: {
  mode: "create" | "edit";
  defaults: BookFormValuesInput;
  categories: { id: string; name: string }[];
}) {
  const [section, setSection] = useState<SectionId>("basicos");
  const [contributors, setContributors] = useState<BookFormContributor[]>(
    defaults.contributors,
  );

  const [state, action, pending] = useActionState<State, FormData>(
    mode === "create" ? createBookAction : updateBookAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <input
        type="hidden"
        name="contributors"
        value={JSON.stringify(contributors)}
      />

      {state?.ok && mode === "edit" ? (
        <Alert variant="success">Obra atualizada.</Alert>
      ) : null}
      {state && !state.ok ? (
        <Alert variant="danger" title="Não foi possível salvar">
          {state.error}
        </Alert>
      ) : null}

      <div
        role="tablist"
        aria-label="Seções do formulário"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`aba-${item.id}`}
            aria-selected={section === item.id}
            aria-controls={`secao-${item.id}`}
            onClick={() => setSection(item.id)}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 font-sans text-[0.875rem] transition-colors",
              section === item.id
                ? "border-neabi-red font-semibold text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-800",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* As seções ocultas permanecem no DOM: os campos continuam sendo
          enviados e a validação nativa do navegador continua funcionando. */}
      <Panel id="basicos" active={section === "basicos"}>
        <Field error={fieldError(state, "title")}>
          <FieldLabel required>Título</FieldLabel>
          <Input name="title" defaultValue={defaults.title} required maxLength={300} />
        </Field>

        <Field error={fieldError(state, "subtitle")}>
          <FieldLabel>Subtítulo</FieldLabel>
          <Input name="subtitle" defaultValue={defaults.subtitle} maxLength={300} />
        </Field>

        <ContributorEditor
          contributors={contributors}
          onChange={setContributors}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={fieldError(state, "institutionName")}>
            <FieldLabel>Instituição</FieldLabel>
            <Input
              name="institutionName"
              defaultValue={defaults.institutionName}
              maxLength={200}
            />
          </Field>

          <Field error={fieldError(state, "publisherName")}>
            <FieldLabel>Editora</FieldLabel>
            <Input
              name="publisherName"
              defaultValue={defaults.publisherName}
              maxLength={160}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={fieldError(state, "collection")}>
            <FieldLabel>Coleção ou série</FieldLabel>
            <Input
              name="collection"
              defaultValue={defaults.collection}
              maxLength={160}
            />
          </Field>

          <Field error={fieldError(state, "edition")}>
            <FieldLabel>Edição</FieldLabel>
            <Input name="edition" defaultValue={defaults.edition} maxLength={80} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            error={fieldError(state, "year")}
            description="Deixe vazio se não estiver impresso no exemplar."
          >
            <FieldLabel>Ano</FieldLabel>
            <Input
              name="year"
              type="number"
              inputMode="numeric"
              defaultValue={defaults.year}
              min={1400}
              max={new Date().getFullYear() + 1}
            />
          </Field>

          <Field error={fieldError(state, "pages")}>
            <FieldLabel>Páginas</FieldLabel>
            <Input
              name="pages"
              type="number"
              inputMode="numeric"
              defaultValue={defaults.pages}
              min={1}
            />
          </Field>

          <Field error={fieldError(state, "language")}>
            <FieldLabel>Idioma</FieldLabel>
            <Input name="language" defaultValue={defaults.language} maxLength={60} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={fieldError(state, "isbn")}
            description="10 ou 13 dígitos, com ou sem hifens."
          >
            <FieldLabel>ISBN</FieldLabel>
            <Input name="isbn" defaultValue={defaults.isbn} maxLength={20} />
          </Field>

          <Field
            error={fieldError(state, "slug")}
            description="Endereço público da obra. Vazio gera automaticamente a partir do título."
          >
            <FieldLabel>Endereço (slug)</FieldLabel>
            <Input name="slug" defaultValue={defaults.slug} maxLength={160} />
          </Field>
        </div>
      </Panel>

      <Panel id="classificacao" active={section === "classificacao"}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={fieldError(state, "materialType")}>
            <FieldLabel required>Tipo do material</FieldLabel>
            <Select name="materialType" defaultValue={defaults.materialType}>
              {Object.values(MaterialType).map((type) => (
                <option key={type} value={type}>
                  {materialTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            error={fieldError(state, "catalogingStatus")}
            description="Marque como conferido apenas depois de checar a ficha catalográfica."
          >
            <FieldLabel required>Situação da catalogação</FieldLabel>
            <Select
              name="catalogingStatus"
              defaultValue={defaults.catalogingStatus}
            >
              {Object.values(CatalogingStatus).map((status) => (
                <option key={status} value={status}>
                  {catalogingStatusLabels[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2.5 font-sans text-[0.8125rem] font-semibold text-ink-800">
            Categorias
          </legend>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink-700"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={defaults.categoryIds.includes(category.id)}
                  className="size-4 cursor-pointer accent-(--neabi-red)"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          error={fieldError(state, "subjectNames")}
          description="Separe por vírgula ou quebra de linha."
        >
          <FieldLabel>Assuntos</FieldLabel>
          <Textarea name="subjectNames" defaultValue={defaults.subjectNames} rows={3} />
        </Field>

        <Field
          error={fieldError(state, "tagNames")}
          description="Separe por vírgula ou quebra de linha."
        >
          <FieldLabel>Tags</FieldLabel>
          <Textarea name="tagNames" defaultValue={defaults.tagNames} rows={2} />
        </Field>
      </Panel>

      <Panel id="descricao" active={section === "descricao"}>
        <Field
          error={fieldError(state, "summary")}
          description="Texto curto usado em listagens e resultados de busca."
        >
          <FieldLabel>Resumo</FieldLabel>
          <Textarea name="summary" defaultValue={defaults.summary} rows={3} maxLength={1200} />
        </Field>

        <Field error={fieldError(state, "description")}>
          <FieldLabel>Descrição</FieldLabel>
          <Textarea
            name="description"
            defaultValue={defaults.description}
            rows={8}
            maxLength={4000}
          />
        </Field>

        <Field
          error={fieldError(state, "notes")}
          description="Uso interno da equipe. Aparece na página da obra como nota de catalogação."
        >
          <FieldLabel>Notas</FieldLabel>
          <Textarea name="notes" defaultValue={defaults.notes} rows={3} maxLength={2000} />
        </Field>

        <Field
          error={fieldError(state, "coverAlt")}
          description="Descrição da imagem da capa para leitores de tela."
        >
          <FieldLabel>Texto alternativo da capa</FieldLabel>
          <Input name="coverAlt" defaultValue={defaults.coverAlt} maxLength={300} />
        </Field>
      </Panel>

      <Panel id="publicacao" active={section === "publicacao"}>
        <Field
          error={fieldError(state, "status")}
          description="Somente obras publicadas aparecem no catálogo público."
        >
          <FieldLabel required>Situação</FieldLabel>
          <Select name="status" defaultValue={defaults.status}>
            {Object.values(BookStatus).map((status) => (
              <option key={status} value={status}>
                {bookStatusLabels[status]}
              </option>
            ))}
          </Select>
        </Field>

        <CheckboxField
          name="featured"
          defaultChecked={defaults.featured}
          label="Destacar esta obra na página inicial"
        />

        <p className="border-l-2 border-border-strong pl-4 text-[0.8125rem] leading-relaxed text-ink-500">
          Capas e documentos são enviados na aba <strong>Arquivos</strong>, na
          página da obra. A consulta digital só é liberada quando um PDF
          autorizado é cadastrado pela administração.
        </p>
      </Panel>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? "Salvando…"
            : mode === "create"
              ? "Cadastrar obra"
              : "Salvar alterações"}
        </Button>
        <p className="text-[0.8125rem] text-ink-500">
          Campos bibliográficos desconhecidos devem permanecer vazios.
        </p>
      </div>
    </form>
  );
}

function Panel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`secao-${id}`}
      aria-labelledby={`aba-${id}`}
      hidden={!active}
      className="flex flex-col gap-5"
    >
      {children}
    </div>
  );
}

/**
 * Editor de responsáveis.
 *
 * Autoria e organização não são um campo de texto: uma obra pode ter várias
 * pessoas em papéis diferentes, e a ordem importa na apresentação dos créditos.
 */
function ContributorEditor({
  contributors,
  onChange,
}: {
  contributors: BookFormContributor[];
  onChange: (value: BookFormContributor[]) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<ContributorRole>(ContributorRole.AUTHOR);

  function add() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    const exists = contributors.some(
      (entry) =>
        entry.name.toLowerCase() === trimmed.toLowerCase() && entry.role === role,
    );
    if (exists) {
      setName("");
      return;
    }
    onChange([...contributors, { name: trimmed, role }]);
    setName("");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= contributors.length) return;
    const next = [...contributors];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    // `min-w-0`: o navegador dá a todo `fieldset` um `min-width: min-content`
    // que nenhum contêiner flex ou grid consegue comprimir. Com um nome longo
    // na lista, a ficha ficava mais larga que a coluna e a página inteira
    // ganhava rolagem horizontal no celular.
    <fieldset className="min-w-0 border border-border p-4">
      <legend className="px-1.5 font-sans text-[0.8125rem] font-semibold text-ink-800">
        Autoria, organização e colaboração
      </legend>

      {contributors.length > 0 ? (
        <ul className="mb-4 flex flex-col divide-y divide-border">
          {contributors.map((contributor, index) => (
            <li
              key={`${contributor.name}-${contributor.role}`}
              className="flex items-center gap-3 py-2 first:pt-0"
            >
              <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink-800">
                {contributor.name}
              </span>
              {/*
                O papel some no celular: com os três botões de ordenação ao
                lado, ele só caberia roubando o espaço do nome, que é o dado
                que a pessoa precisa ler para saber qual linha está movendo.
              */}
              <span className="hidden shrink-0 text-[0.75rem] uppercase tracking-[0.06em] text-ink-500 min-[420px]:inline">
                {contributorRoleLabels[contributor.role]}
              </span>
              <div className="flex shrink-0 gap-1">
                <IconButton
                  label={`Mover ${contributor.name} para cima`}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </IconButton>
                <IconButton
                  label={`Mover ${contributor.name} para baixo`}
                  onClick={() => move(index, 1)}
                  disabled={index === contributors.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton
                  label={`Remover ${contributor.name}`}
                  onClick={() =>
                    onChange(contributors.filter((_, i) => i !== index))
                  }
                >
                  ×
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-[0.8125rem] text-ink-500">
          Nenhuma pessoa registrada. Se a autoria não estiver visível no
          exemplar, deixe em branco — não presuma.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Nome</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="Nome completo"
            maxLength={160}
            className="min-h-11 w-full border border-ink-900/20 bg-white px-3 text-[0.875rem] text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none"
          />
        </label>
        <label className="sm:w-52">
          <span className="sr-only">Papel</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ContributorRole)}
            className="min-h-11 w-full cursor-pointer border border-ink-900/20 bg-white px-3 text-[0.875rem] text-ink-900 focus:border-ink-900 focus:outline-none"
          >
            {Object.values(ContributorRole).map((value) => (
              <option key={value} value={value}>
                {contributorRoleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={add}>
          Adicionar
        </Button>
      </div>
    </fieldset>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center border border-ink-900/15 text-ink-600 transition-colors hover:border-ink-900/40 hover:text-ink-900 disabled:opacity-35"
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return state.field === field ? state.error : null;
}
