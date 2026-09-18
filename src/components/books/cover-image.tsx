"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

/**
 * Fotografia da capa, com volta para a ficha do sistema quando o arquivo falha.
 *
 * O caminho da capa vem do banco e o arquivo pode não estar lá: uma foto
 * removida do bucket, uma chave digitada errado no painel, o storage fora do ar.
 * Sem tratamento, o navegador desenha seu ícone de imagem quebrada — que não
 * diz nada a quem lê e ainda parece defeito do site. Aqui a falha cai na mesma
 * ficha usada por obras sem fotografia.
 *
 * É o único pedaço cliente da capa, e existe só por causa do `onError`: o
 * enquadramento, o `alt` e a ficha continuam decididos no servidor e chegam
 * prontos como `fallback`.
 */
export function CoverImage({
  src,
  alt,
  sizes,
  priority,
  fit,
  fallback,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority: boolean;
  fit: "cover" | "contain";
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      // `priority` foi descontinuado no Next 16; carregamento antecipado com
      // prioridade alta é o equivalente recomendado.
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
      className={fit === "contain" ? "object-contain" : "object-cover"}
    />
  );
}
