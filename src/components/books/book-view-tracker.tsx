"use client";

import { useEffect } from "react";

/**
 * Conta a leitura da ficha depois que ela abre no navegador — ver
 * `src/app/api/visualizacoes/route.ts`. Não desenha nada.
 */
export function BookViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const body = JSON.stringify({ slug });
    // `keepalive` deixa a requisição terminar mesmo se a pessoa sair da
    // página logo em seguida.
    fetch("/api/visualizacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
