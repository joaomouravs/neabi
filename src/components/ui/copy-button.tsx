"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Copia um valor curto (protocolo, link) e confirma com uma notificação.
 * Se o navegador negar a área de transferência, avisa em vez de falhar calado.
 */
export function CopyButton({
  value,
  label = "Copiar",
  successTitle = "Copiado",
  variant = "outline",
  size = "sm",
  className,
}: {
  value: string;
  label?: string;
  successTitle?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify({ title: successTitle, description: value });
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      notify({
        tone: "danger",
        title: "Não foi possível copiar",
        description: "Selecione o texto e copie manualmente.",
      });
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleCopy} className={className}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}
