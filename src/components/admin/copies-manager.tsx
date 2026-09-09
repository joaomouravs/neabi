"use client";

import { useActionState, useState } from "react";

import { AdminTable, Td, Th } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { copyConditionLabels, copyStatusLabels } from "@/config/catalog";
import {
  createCopyAction,
  deleteCopyAction,
  updateCopyAction,
} from "@/features/catalog-admin/actions";
import { CopyCondition, CopyStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<unknown> | null;

export interface CopyRecord {
  id: string;
  code: string;
  patrimonyCode: string | null;
  location: string | null;
  shelf: string | null;
  condition: CopyCondition | null;
  status: CopyStatus;
  notes: string | null;
}

/**
 * Gestão dos exemplares de uma obra.
 *
 * Número de tombo e localização começam vazios de propósito: são dados que o
 * NEABI atribui e registra, não valores que o sistema pode gerar.
 */
export function CopiesManager({
  bookId,
  copies,
}: {
  bookId: string;
  copies: CopyRecord[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-ink-600">
          {copies.length}{" "}
          {copies.length === 1 ? "exemplar cadastrado" : "exemplares cadastrados"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAdding((value) => !value);
            setEditing(null);
          }}
          aria-expanded={adding}
        >
          {adding ? "Cancelar" : "Adicionar exemplar"}
        </Button>
      </div>

      {adding ? (
        <div className="border border-border bg-surface-muted p-4">
          <h3 className="mb-4 font-display text-base font-semibold text-ink-900">
            Novo exemplar
          </h3>
          <CopyForm
            mode="create"
            bookId={bookId}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : null}

      {copies.length === 0 ? (
        <p className="border border-dashed border-border-strong px-4 py-6 text-center text-[0.875rem] text-ink-500">
          Nenhum exemplar cadastrado. Sem exemplar físico, a obra não pode ser
          reservada.
        </p>
      ) : (
        <AdminTable
          caption="Exemplares desta obra"
          head={
            <>
              <Th>Código</Th>
              <Th>Tombo</Th>
              <Th>Localização</Th>
              <Th>Situação</Th>
              <Th>
                <span className="sr-only">Ações</span>
              </Th>
            </>
          }
        >
          {copies.map((copy) => (
            <tr key={copy.id}>
              {editing === copy.id ? (
                <td colSpan={5} className="bg-surface-muted p-4">
                  <CopyForm
                    mode="edit"
                    bookId={bookId}
                    copy={copy}
                    onDone={() => setEditing(null)}
                  />
                </td>
              ) : (
                <>
                  <Td className="font-mono text-[0.8125rem]">{copy.code}</Td>
                  <Td className="text-ink-600">
                    {copy.patrimonyCode ?? (
                      <span className="text-ink-400">— não informado</span>
                    )}
                  </Td>
                  <Td className="text-ink-600">
                    {[copy.location, copy.shelf].filter(Boolean).join(" · ") || (
                      <span className="text-ink-400">— não informada</span>
                    )}
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        copy.status === CopyStatus.AVAILABLE
                          ? "green"
                          : copy.status === CopyStatus.LOST
                            ? "red"
                            : "neutral"
                      }
                      size="sm"
                    >
                      {copyStatusLabels[copy.status]}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(copy.id);
                        setAdding(false);
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
      )}
    </div>
  );
}

function CopyForm({
  mode,
  bookId,
  copy,
  onDone,
}: {
  mode: "create" | "edit";
  bookId: string;
  copy?: CopyRecord;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    mode === "create" ? createCopyAction : updateCopyAction,
    null,
  );
  const [deleteState, deleteAction, deleting] = useActionState<State, FormData>(
    deleteCopyAction,
    null,
  );

  if (state?.ok || deleteState?.ok) {
    // O revalidatePath da ação já recarregou a lista; só fechamos o editor.
    queueMicrotask(onDone);
  }

  return (
    <div className="flex flex-col gap-4">
      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}
      {deleteState && !deleteState.ok ? (
        <Alert variant="danger">{deleteState.error}</Alert>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        {mode === "create" ? (
          <input type="hidden" name="bookId" value={bookId} />
        ) : (
          <input type="hidden" name="id" value={copy?.id} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={fieldError(state, "code")}
            description={
              mode === "create"
                ? "Vazio gera um código sequencial automaticamente."
                : undefined
            }
          >
            <FieldLabel>Código interno</FieldLabel>
            <Input name="code" defaultValue={copy?.code ?? ""} maxLength={60} />
          </Field>

          <Field
            error={fieldError(state, "patrimonyCode")}
            description="Deixe vazio até o NEABI atribuir o tombo."
          >
            <FieldLabel>Número de tombo</FieldLabel>
            <Input
              name="patrimonyCode"
              defaultValue={copy?.patrimonyCode ?? ""}
              maxLength={60}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldError(state, "location")}>
            <FieldLabel>Localização</FieldLabel>
            <Input
              name="location"
              defaultValue={copy?.location ?? ""}
              maxLength={160}
              placeholder="Ex.: Sala do NEABI"
            />
          </Field>

          <Field error={fieldError(state, "shelf")}>
            <FieldLabel>Prateleira</FieldLabel>
            <Input name="shelf" defaultValue={copy?.shelf ?? ""} maxLength={60} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldError(state, "status")}>
            <FieldLabel required>Situação</FieldLabel>
            <Select name="status" defaultValue={copy?.status ?? CopyStatus.AVAILABLE}>
              {Object.values(CopyStatus).map((status) => (
                <option key={status} value={status}>
                  {copyStatusLabels[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field error={fieldError(state, "condition")}>
            <FieldLabel>Estado de conservação</FieldLabel>
            <Select name="condition" defaultValue={copy?.condition ?? ""}>
              <option value="">Não avaliado</option>
              {Object.values(CopyCondition).map((condition) => (
                <option key={condition} value={condition}>
                  {copyConditionLabels[condition]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field error={fieldError(state, "notes")}>
          <FieldLabel>Observações</FieldLabel>
          <Textarea name="notes" defaultValue={copy?.notes ?? ""} rows={2} maxLength={500} />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando…" : "Salvar exemplar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </form>

      {mode === "edit" && copy ? (
        <form action={deleteAction} className="border-t border-border pt-4">
          <input type="hidden" name="id" value={copy.id} />
          <Button type="submit" variant="danger" size="sm" disabled={deleting}>
            {deleting ? "Excluindo…" : "Excluir exemplar"}
          </Button>
          <p className="mt-2 text-[0.75rem] text-ink-500">
            Exemplares com histórico de reservas não podem ser excluídos — marque
            como indisponível ou extraviado.
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
