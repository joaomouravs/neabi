import type { Metadata } from "next";

import { Container } from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import Link from "@/components/ui/link";

/**
 * Destino depois que o titular exclui a conta. Estática e sem dado nenhum: a
 * sessão já foi encerrada quando a pessoa chega aqui.
 */
export const metadata: Metadata = {
  title: "Conta excluída",
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-2xl">
        <p className="eyebrow text-neabi-red-600">Minha conta</p>
        <h1 className="mt-2 font-display text-display-sm font-bold text-ink-900">
          Sua conta foi excluída
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-700">
          Os seus dados pessoais foram apagados e as reservas em andamento, canceladas.
          O acervo continua aberto para consulta, com ou sem conta.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/acervo">Explorar o acervo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
