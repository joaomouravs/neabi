import Link from "next/link";

import { ErrorLayout } from "@/components/layout/error-layout";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <ErrorLayout
      code="403"
      title="Acesso não autorizado"
      description="Sua conta não tem permissão para acessar esta área. Se você faz parte da equipe do NEABI e precisa de acesso, fale com a administração."
    >
      <Button asChild size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
      <Button asChild variant="onDarkOutline" size="lg">
        <Link href="/minha-conta">Ir para minha conta</Link>
      </Button>
    </ErrorLayout>
  );
}
