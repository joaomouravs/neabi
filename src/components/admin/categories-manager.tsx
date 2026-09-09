"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AdminTable, Td, Th } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  Field,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/features/catalog-admin/actions";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<unknown> | null;

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  featured: boolean;
  bookCount: number;
}

export function CategoriesManager({
  categories,
}: {
  categories: CategoryRecord[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCreating((value) => !value);
            setEditing(null);
          }}
          aria-expanded={creating}
        >
          {creating ? "Cancelar" : "Nova categoria"}
        </Button>
      </div>

      {creating ? (
        <div className="border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">
            Nova categoria
          </h2>
          <CategoryForm mode="create" onDone={() => setCreating(false)} />
        </div>
      ) : null}

      <AdminTable
        caption="Categorias do acervo"
        head={
          <>
            <Th>Categoria</Th>
            <Th>Endereço</Th>
            <Th className="text-center">Obras</Th>
            <Th className="text-center">Ordem</Th>
            <Th>
              <span className="sr-only">Ações</span>
            </Th>
          </>
        }
      >
        {categories.map((category) => (
          <tr key={category.id}>
            {editing === category.id ? (
              <td colSpan={5} className="bg-surface-muted p-5">
                <CategoryForm
                  mode="edit"
                  category={category}
                  onDone={() => setEditing(null)}
                />
              </td>
            ) : (
              <>
                <Td className="max-w-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink-900">
                      {category.name}
                    </span>
                    {category.featured ? (
                      <Badge variant="amber" size="sm">
                        Destaque
                      </Badge>
                    ) : null}
                  </div>
                  {category.description ? (
                    <p className="mt-0.5 line-clamp-2 text-[0.8125rem] text-ink-500">
                      {category.description}
                    </p>
                  ) : null}
                </Td>
                <Td className="font-mono text-[0.75rem] text-ink-600">
                  {category.slug}
                </Td>
                <Td className="text-center tabular-nums">
                  {category.bookCount > 0 ? (
                    <Link
                      href={`/acervo?category=${category.slug}`}
                      className="underline underline-offset-4"
                    >
                      {category.bookCount}
                    </Link>
                  ) : (
                    <span className="text-ink-400">0</span>
                  )}
                </Td>
                <Td className="text-center tabular-nums text-ink-600">
                  {category.sortOrder}
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(category.id);
                      setCreating(false);
                    }}
                    className="text-[0.8125rem] font-semibold text-neabi-red-600 underline underline-offset-4"
                  >
                    Editar
                  </button>
                </Td>
              </>
            )}
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

function CategoryForm({
  mode,
  category,
  onDone,
}: {
  mode: "create" | "edit";
  category?: CategoryRecord;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    mode === "create" ? createCategoryAction : updateCategoryAction,
    null,
  );
  const [deleteState, deleteAction, deleting] = useActionState<State, FormData>(
    deleteCategoryAction,
    null,
  );

  if (state?.ok || deleteState?.ok) queueMicrotask(onDone);

  return (
    <div className="flex flex-col gap-4">
      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}
      {deleteState && !deleteState.ok ? (
        <Alert variant="danger">{deleteState.error}</Alert>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        {category ? <input type="hidden" name="id" value={category.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldError(state, "name")}>
            <FieldLabel required>Nome</FieldLabel>
            <Input name="name" defaultValue={category?.name ?? ""} required maxLength={120} />
          </Field>

          <Field
            error={fieldError(state, "slug")}
            description="Vazio gera automaticamente a partir do nome."
          >
            <FieldLabel>Endereço (slug)</FieldLabel>
            <Input name="slug" defaultValue={category?.slug ?? ""} maxLength={120} />
          </Field>
        </div>

        <Field error={fieldError(state, "description")}>
          <FieldLabel>Descrição</FieldLabel>
          <Textarea
            name="description"
            defaultValue={category?.description ?? ""}
            rows={2}
            maxLength={500}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={fieldError(state, "sortOrder")}
            description="Menor número aparece primeiro."
          >
            <FieldLabel>Ordem</FieldLabel>
            <Input
              name="sortOrder"
              type="number"
              min={0}
              max={999}
              defaultValue={category?.sortOrder ?? 0}
            />
          </Field>

          <div className="flex items-end pb-2">
            <CheckboxField
              name="featured"
              defaultChecked={category?.featured ?? false}
              label="Exibir entre os filtros rápidos do acervo"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando…" : "Salvar categoria"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </form>

      {mode === "edit" && category ? (
        <form action={deleteAction} className="border-t border-border pt-4">
          <input type="hidden" name="id" value={category.id} />
          <Button type="submit" variant="danger" size="sm" disabled={deleting}>
            {deleting ? "Excluindo…" : "Excluir categoria"}
          </Button>
          <p className="mt-2 text-[0.75rem] text-ink-500">
            Categorias associadas a obras não podem ser excluídas.
          </p>
        </form>
      ) : null}
    </div>
  );
}

function fieldError(state: State, field: string): string | null {
  if (!state || state.ok) return null;
  return "field" in state && state.field === field ? state.error : null;
}
