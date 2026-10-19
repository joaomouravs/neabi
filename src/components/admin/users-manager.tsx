"use client";

import { useActionState, useState } from "react";

import { Td } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Alert } from "@/components/ui/feedback";
import { patronTypeLabels, roleLabels } from "@/config/catalog";
import {
  changeUserRoleAction,
  resetUserPasswordAction,
  setUserActiveAction,
} from "@/features/users/actions";
import { Role, type PatronType } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import type { ActionResult } from "@/server/errors";

type State = ActionResult<undefined> | null;

export interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  patronType: PatronType | null;
  registrationId: string | null;
  createdAt: Date;
  activeReservations: number;
  totalReservations: number;
}

/**
 * Linha de usuário com as ações administrativas.
 *
 * O papel é alterado por um `<select>` dentro de um formulário próprio: cada
 * linha envia apenas o seu próprio identificador, e o servidor revalida quem
 * está pedindo a mudança.
 */
export function UserRow({
  user,
  canChangeRole,
  canManage,
  isSelf,
}: {
  user: UserRecord;
  canChangeRole: boolean;
  canManage: boolean;
  isSelf: boolean;
}) {
  return (
    <tr className="hover:bg-surface-muted">
      <Td className="max-w-64">
        <p className="font-medium text-ink-900">
          {user.name ?? "—"}
          {isSelf ? (
            <span className="ml-2 text-[0.75rem] font-normal text-ink-500">
              (você)
            </span>
          ) : null}
        </p>
        <p className="truncate text-[0.8125rem] text-ink-500">{user.email}</p>
      </Td>
      <Td className="text-ink-600">
        {user.patronType ? patronTypeLabels[user.patronType] : "—"}
        {user.registrationId ? (
          <span className="block text-[0.75rem] text-ink-500">
            {user.registrationId}
          </span>
        ) : null}
      </Td>
      <Td className="text-center tabular-nums">
        <span className="text-ink-900">{user.activeReservations}</span>
        <span className="text-ink-400"> / {user.totalReservations}</span>
      </Td>
      <Td className="whitespace-nowrap text-[0.8125rem] text-ink-500">
        {formatDate(user.createdAt)}
      </Td>
      <Td>
        {canChangeRole && !isSelf ? (
          <RoleForm userId={user.id} role={user.role} />
        ) : (
          <Badge variant={user.role === Role.ADMIN ? "red" : "neutral"} size="sm">
            {roleLabels[user.role]}
          </Badge>
        )}
      </Td>
      <Td className="text-right">
        {canManage ? (
          <div className="flex flex-col items-end gap-2">
            <ActiveForm userId={user.id} active={user.active} disabled={isSelf} />
            {!isSelf && user.active ? <ResetPasswordForm userId={user.id} /> : null}
          </div>
        ) : (
          <Badge variant={user.active ? "green" : "neutral"} size="sm">
            {user.active ? "Ativa" : "Desativada"}
          </Badge>
        )}
      </Td>
    </tr>
  );
}

function RoleForm({ userId, role }: { userId: string; role: Role }) {
  const [state, action, pending] = useActionState<State, FormData>(
    changeUserRoleAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>
          Perfil de acesso
        </label>
        <select
          id={`role-${userId}`}
          name="role"
          defaultValue={role}
          disabled={pending}
          className="min-h-9 cursor-pointer border border-ink-900/20 bg-white px-2 text-[0.8125rem] text-ink-900 focus:border-ink-900 focus:outline-none"
        >
          {Object.values(Role).map((value) => (
            <option key={value} value={value}>
              {roleLabels[value]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          {pending ? "…" : "Aplicar"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p className="max-w-56 text-[0.75rem] leading-snug text-neabi-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function ActiveForm({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    setUserActiveAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      {/* Enviar o inverso do estado atual: o botão alterna a situação. */}
      {active ? null : <input type="hidden" name="active" value="on" />}
      <Button
        type="submit"
        variant={active ? "danger" : "success"}
        size="sm"
        disabled={pending || disabled}
      >
        {pending ? "…" : active ? "Desativar" : "Reativar"}
      </Button>
      {state && !state.ok ? (
        <p className="max-w-56 text-right text-[0.75rem] leading-snug text-neabi-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Senha temporária gerada pela administração. Aparece uma única vez: não fica
 * gravada em lugar nenhum além do hash, e some ao recarregar a página.
 */
function ResetPasswordForm({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<{ temporaryPassword: string }> | null,
    FormData
  >(resetUserPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex max-w-64 flex-col items-end gap-1.5 text-right">
        <p className="text-[0.75rem] leading-snug text-ink-600">Senha temporária:</p>
        <div className="flex items-center gap-2">
          <code className="whitespace-nowrap bg-neabi-cream-200 px-2 py-1 font-mono text-[0.8125rem] font-semibold text-ink-900">
            {state.data.temporaryPassword}
          </code>
          <CopyButton value={state.data.temporaryPassword} label="Copiar senha" />
        </div>
        <p className="text-[0.75rem] leading-snug text-ink-500">
          Entregue pessoalmente. Ela aparece só agora; a pessoa deve trocá-la em
          Minha conta → Perfil.
        </p>
      </div>
    );
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Redefinir senha
      </Button>
    );
  }

  return (
    <form action={action} className="flex max-w-64 flex-col items-end gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-right text-[0.75rem] leading-snug text-ink-600">
        A senha atual deixa de funcionar.
      </p>
      {state && !state.ok ? (
        <p className="text-right text-[0.75rem] leading-snug text-neabi-red-700">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "…" : "Gerar senha"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function UsersFeedback({ message }: { message: string }) {
  return <Alert variant="info">{message}</Alert>;
}
