"use client";

import { useSessionState } from "@/components/layout/session-state";

/** Aviso exibido apenas a quem ainda não entrou na conta. */
export function SignInHint({ children, className }: { children: React.ReactNode; className?: string }) {
  const { status, user } = useSessionState();
  if (status !== "ready" || user) return null;
  return <p className={className}>{children}</p>;
}
