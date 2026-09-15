"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Compartilhar a obra e copiar a referência bibliográfica.
 *
 * Compartilhar usa a folha nativa do sistema quando existe (celular) e, fora
 * dela, copia o link. A cópia sempre confirma com uma notificação — e, se o
 * navegador negar a área de transferência, diz isso em vez de falhar calado.
 */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareButton({ title, path }: { title: string; path: string }) {
  const { notify } = useToast();

  async function handleShare() {
    const url = new URL(path, window.location.origin).toString();

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${title} — Biblioteca NEABI`, url });
        return;
      } catch (error) {
        // Fechar a folha de compartilhamento não é erro.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    if (await copyText(url)) {
      notify({ title: "Link copiado", description: "O endereço da obra está na área de transferência." });
    } else {
      notify({
        tone: "danger",
        title: "Não foi possível copiar o link",
        description: "Copie o endereço diretamente da barra do navegador.",
      });
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 aria-hidden="true" />
      Compartilhar
    </Button>
  );
}

export function CopyReference({ reference }: { reference: string }) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (await copyText(reference)) {
      setCopied(true);
      notify({ title: "Referência copiada", description: "Formato ABNT simplificado." });
      window.setTimeout(() => setCopied(false), 2400);
    } else {
      notify({
        tone: "danger",
        title: "Não foi possível copiar",
        description: "Selecione o texto da referência e copie manualmente.",
      });
    }
  }

  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="eyebrow tracking-[0.12em] text-ink-500">Referência · ABNT simplificada</p>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="-mr-2">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <p className="select-all px-4 py-3.5 font-sans text-[0.875rem] leading-relaxed text-ink-800">
        {reference}
      </p>
    </div>
  );
}
