"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorLayout } from "@/components/layout/error-layout";
import { Button } from "@/components/ui/button";

/**
 * Erro inesperado em uma rota.
 *
 * A mensagem técnica nunca é exibida: vai para o log do servidor. A pessoa
 * usuária recebe uma saída clara e a possibilidade de tentar de novo.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro não tratado:", error);
  }, [error]);

  return (
    <ErrorLayout
      code="500"
      title="Algo deu errado"
      description="Não conseguimos concluir esta operação. Tente novamente em alguns instantes; se o problema continuar, avise a equipe do NEABI."
      reference={error.digest}
    >
      <Button size="lg" onClick={reset}>
        Tentar novamente
      </Button>
      <Button asChild variant="onDarkOutline" size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </ErrorLayout>
  );
}
