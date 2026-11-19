"use client";

import Link from "@/components/ui/link";

import { useSessionState } from "./session-state";

/**
 * O único item do rodapé que depende de quem está conectado. Fica no cliente
 * para que o rodapé — e a página inteira — continue estático.
 */
export function FooterAccountLink({ className }: { className: string }) {
  const { user } = useSessionState();
  return user ? (
    <Link href="/minha-conta" className={className}>
      Minha conta
    </Link>
  ) : (
    <Link href="/login" className={className}>
      Entrar ou criar conta
    </Link>
  );
}
