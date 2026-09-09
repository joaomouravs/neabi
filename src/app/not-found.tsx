import Link from "next/link";

import { ErrorLayout } from "@/components/layout/error-layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ErrorLayout
      code="404"
      title="Página não encontrada"
      description="O endereço acessado não existe, foi movido ou a obra procurada não está mais publicada no acervo."
    >
      <Button asChild size="lg">
        <Link href="/acervo">Ir para o acervo</Link>
      </Button>
      <Button asChild variant="onDarkOutline" size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </ErrorLayout>
  );
}
