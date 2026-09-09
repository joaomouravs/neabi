"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";

/**
 * Visualizador de documentos.
 *
 * Decisão deliberada: apoiamo-nos no leitor de PDF nativo do navegador dentro
 * de um `<iframe>`, em vez de embutir um renderizador próprio.
 *
 * Motivos: o leitor nativo já oferece zoom, navegação por páginas, busca no
 * texto, seleção e — o ponto decisivo — acessibilidade real, incluindo leitura
 * do texto marcado por leitores de tela. Um renderizador em canvas entregaria
 * controles mais bonitos e uma experiência pior para quem mais depende deles.
 *
 * O que envolvemos: estados de carregamento e erro, tela cheia, abertura em
 * nova aba e download quando autorizado.
 */
export function DigitalReader({
  source,
  fileName,
  downloadAllowed,
  title,
}: {
  source: string;
  fileName: string;
  downloadAllowed: boolean;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [fullscreen, setFullscreen] = useState(false);

  async function toggleFullscreen() {
    const element = containerRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreen(false);
      } else {
        await element.requestFullscreen();
        setFullscreen(true);
      }
    } catch {
      // Alguns navegadores recusam tela cheia sem gesto direto; o leitor
      // continua utilizável no fluxo normal da página.
      setFullscreen(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {fullscreen ? "Sair da tela cheia" : "Tela cheia"}
        </Button>

        <Button asChild variant="ghost" size="sm">
          <a href={source} target="_blank" rel="noreferrer noopener">
            Abrir em nova aba
          </a>
        </Button>

        {/* Só oferecido quando a administração autorizou o download. */}
        {downloadAllowed ? (
          <Button asChild variant="ghost" size="sm">
            <a href={`${source}?download=1`} download={fileName}>
              Baixar arquivo
            </a>
          </Button>
        ) : (
          <span className="text-[0.8125rem] text-ink-500">
            Download não autorizado para esta obra.
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[70dvh] border border-border-strong bg-neabi-cream-100"
      >
        {status === "loading" ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex flex-col gap-3 p-6"
          >
            <span className="sr-only">Carregando o documento…</span>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="mt-4 flex-1 w-full" />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <Alert variant="danger" title="Não foi possível exibir o documento">
              Tente abrir o arquivo em uma nova aba. Se o problema continuar,
              avise a equipe do NEABI.
            </Alert>
          </div>
        ) : null}

        <iframe
          src={source}
          title={`Documento digital: ${title}`}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          className="h-[70dvh] w-full"
        />
      </div>
    </div>
  );
}
