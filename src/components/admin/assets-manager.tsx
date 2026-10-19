"use client";

import { useActionState, useState, type FormEvent } from "react";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import {
  authorizeAssetAction,
  deleteAssetAction,
  removeCoverAction,
  uploadCoverAction,
  uploadDocumentAction,
} from "@/features/books/actions";
import { AssetKind } from "@/generated/prisma/enums";
import { resolveAssetUrl } from "@/lib/asset-url";
import type { ActionResult } from "@/server/errors";
import type { UploadLimits } from "@/server/storage";

type State = ActionResult<unknown> | null;

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  authorized: boolean;
  downloadAllowed: boolean;
}

/**
 * Arquivos da obra.
 *
 * Duas regras que a interface deixa explícitas:
 *  - a capa deve ser a fotografia real do exemplar; nada é gerado;
 *  - enviar um PDF **não** libera consulta digital. A liberação é um ato
 *    separado, restrito à administração, com implicação de direito autoral.
 */
export function AssetsManager({
  bookId,
  coverImage,
  bookTitle,
  assets,
  canAuthorize,
  canDelete,
  limits,
}: {
  bookId: string;
  coverImage: string | null;
  bookTitle: string;
  assets: AssetRecord[];
  canAuthorize: boolean;
  canDelete: boolean;
  limits: UploadLimits;
}) {
  const covers = assets.filter((asset) => asset.kind === AssetKind.COVER);
  const documents = assets.filter((asset) => asset.kind === AssetKind.PDF);

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="capa-titulo">
        <h3
          id="capa-titulo"
          className="font-display text-lg font-semibold text-ink-900"
        >
          Capa
        </h3>
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-ink-600">
          Envie a fotografia do exemplar físico. Fotos de livro sobre a mesa são
          aceitas normalmente. Não use capas de outra edição nem imagens geradas
          artificialmente.
        </p>

        <div className="mt-5 flex flex-wrap items-start gap-6">
          <div className="w-32 shrink-0">
            {/*
              Pré-visualização com o mesmo enquadramento da página da obra:
              a fotografia inteira, sem recorte, para que a equipe confira o
              que o público vai ver — inclusive se a capa é a da obra certa.
            */}
            <BookCover
              title={bookTitle}
              coverImage={coverImage}
              sizes="128px"
              fit={coverImage ? "contain" : "cover"}
              className="border border-border"
            />
            <p className="mt-2 text-center text-[0.75rem] text-ink-500">
              {coverImage ? "Capa vinculada" : "Sem capa — ficha do sistema"}
            </p>
          </div>

          <div className="min-w-64 flex-1">
            <UploadForm
              action={uploadCoverAction}
              bookId={bookId}
              label={coverImage ? "Substituir capa" : "Adicionar capa"}
              accept="image/jpeg,image/png,image/webp,image/avif"
              hint={`JPG, PNG, WebP ou AVIF, até ${formatLimit(limits.image)}.`}
              maxBytes={limits.image}
            />

            {coverImage && canDelete ? (
              <div className="mt-4 border-t border-border pt-4">
                <RemoveCoverButton bookId={bookId} />
                <p className="mt-2 max-w-prose text-[0.75rem] leading-relaxed text-ink-500">
                  Desvincula somente a capa. Os dados da obra permanecem
                  intactos e ela passa a aparecer com a ficha do sistema.
                </p>
              </div>
            ) : null}

            {covers.length > 0 ? (
              <ul className="mt-5 flex flex-col divide-y divide-border border-t border-border">
                {covers.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] text-ink-800">
                        {asset.fileName}
                      </p>
                      <p className="text-[0.75rem] text-ink-500">
                        {formatBytes(asset.size)}
                      </p>
                    </div>
                    {canDelete ? <DeleteAssetButton assetId={asset.id} /> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="documentos-titulo" className="border-t border-border pt-8">
        <h3
          id="documentos-titulo"
          className="font-display text-lg font-semibold text-ink-900"
        >
          Documentos digitais
        </h3>
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-ink-600">
          O envio de um PDF não libera a leitura online. A consulta digital só
          aparece no site depois que a administração autoriza explicitamente o
          arquivo.
        </p>

        <div className="mt-5 max-w-md">
          <UploadForm
            action={uploadDocumentAction}
            bookId={bookId}
            label="Enviar PDF"
            accept="application/pdf"
            hint={`Somente PDF, até ${formatLimit(limits.document)}.`}
            maxBytes={limits.document}
          />
        </div>

        {documents.length === 0 ? (
          <p className="mt-6 border border-dashed border-border-strong px-4 py-5 text-center text-[0.875rem] text-ink-500">
            Nenhum documento digital cadastrado. A obra aparece no site como
            acervo exclusivamente físico.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {documents.map((asset) => (
              <li key={asset.id} className="border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">
                      {asset.fileName}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-ink-500">
                      {formatBytes(asset.size)}
                      {" · "}
                      <a
                        href={resolveAssetUrl(asset.storageKey) ?? "#"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline underline-offset-4"
                      >
                        Abrir arquivo
                      </a>
                    </p>
                  </div>
                  <Badge
                    variant={asset.authorized ? "green" : "neutral"}
                    size="sm"
                  >
                    {asset.authorized
                      ? "Consulta digital autorizada"
                      : "Não autorizado"}
                  </Badge>
                </div>

                {canAuthorize ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <AuthorizeForm asset={asset} />
                  </div>
                ) : (
                  <p className="mt-3 text-[0.75rem] text-ink-500">
                    Somente a administração pode autorizar a consulta digital.
                  </p>
                )}

                {canDelete ? (
                  <div className="mt-3">
                    <DeleteAssetButton assetId={asset.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function UploadForm({
  action,
  bookId,
  label,
  accept,
  hint,
  maxBytes,
}: {
  action: (previous: unknown, formData: FormData) => Promise<ActionResult<unknown>>;
  bookId: string;
  label: string;
  accept: string;
  hint: string;
  maxBytes: number;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    action,
    null,
  );
  const [tooLarge, setTooLarge] = useState<string | null>(null);

  // O servidor confere de novo; checar aqui evita subir megabytes que seriam
  // recusados — e, na Vercel, recusados antes com um erro genérico da
  // plataforma em vez desta mensagem.
  function checkSize(event: FormEvent<HTMLFormElement>) {
    const file = new FormData(event.currentTarget).get("file");
    if (file instanceof File && file.size > maxBytes) {
      event.preventDefault();
      setTooLarge(
        `"${file.name}" tem ${formatBytes(file.size)}; o limite é ${formatLimit(maxBytes)}. Reduza o arquivo e envie de novo.`,
      );
    } else {
      setTooLarge(null);
    }
  }

  return (
    <form action={formAction} onSubmit={checkSize} className="flex flex-col gap-3">
      <input type="hidden" name="bookId" value={bookId} />

      {tooLarge ? <Alert variant="danger">{tooLarge}</Alert> : null}
      {!tooLarge && state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}
      {!tooLarge && state?.ok ? <Alert variant="success">Arquivo enviado.</Alert> : null}

      <Field description={hint}>
        <FieldLabel>{label}</FieldLabel>
        <Input type="file" name="file" accept={accept} required />
      </Field>

      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Enviando…" : "Enviar arquivo"}
        </Button>
      </div>
    </form>
  );
}

function AuthorizeForm({ asset }: { asset: AssetRecord }) {
  const [state, action, pending] = useActionState<State, FormData>(
    authorizeAssetAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="assetId" value={asset.id} />

      {state && !state.ok ? <Alert variant="danger">{state.error}</Alert> : null}

      <label className="flex items-center gap-2.5 text-[0.875rem] text-ink-800">
        <input
          type="checkbox"
          name="authorized"
          defaultChecked={asset.authorized}
          className="size-4 accent-(--neabi-red)"
        />
        Autorizar consulta digital desta obra no site
      </label>

      <label className="flex items-center gap-2.5 text-[0.875rem] text-ink-800">
        <input
          type="checkbox"
          name="downloadAllowed"
          defaultChecked={asset.downloadAllowed}
          className="size-4 accent-(--neabi-red)"
        />
        Permitir download do arquivo
      </label>

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Aplicando…" : "Aplicar autorização"}
        </Button>
      </div>
    </form>
  );
}

function RemoveCoverButton({ bookId }: { bookId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(
    removeCoverAction,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="bookId" value={bookId} />
      {state && !state.ok ? (
        <p className="mb-2 text-[0.75rem] text-neabi-red-700">{state.error}</p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Removendo…" : "Remover capa"}
      </Button>
    </form>
  );
}

function DeleteAssetButton({ assetId }: { assetId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(
    deleteAssetAction,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="assetId" value={assetId} />
      {state && !state.ok ? (
        <p className="mb-2 text-[0.75rem] text-neabi-red-700">{state.error}</p>
      ) : null}
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "Removendo…" : "Remover arquivo"}
      </Button>
    </form>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLimit(bytes: number): string {
  return `${Math.floor(bytes / (1024 * 1024))} MB`;
}
