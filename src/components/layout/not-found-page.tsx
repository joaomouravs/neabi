import Link from "next/link";

import { SearchCombobox } from "@/components/catalog/search-combobox";
import { Button } from "@/components/ui/button";

import { ErrorLayout } from "./error-layout";

/**
 * A 404 da biblioteca, com a busca à mão: quem chegou a um endereço quebrado
 * quase sempre procurava uma obra.
 */
export function NotFoundPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <ErrorLayout
      code="404"
      title="Página não encontrada"
      description="O endereço acessado não existe, foi movido ou a obra procurada não está mais publicada no acervo."
      embedded={embedded}
      aside={
        <div className="max-w-xl">
          <p className="eyebrow text-neabi-amber">Procurando uma obra?</p>
          <div className="mt-3">
            <SearchCombobox variant="hero" />
          </div>
        </div>
      }
    >
      <Button asChild variant="onDark" size="lg">
        <Link href="/acervo">Ir para o acervo</Link>
      </Button>
      <Button asChild variant="onDarkOutline" size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </ErrorLayout>
  );
}
