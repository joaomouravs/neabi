"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Voltar ao topo.
 *
 * Aparece depois de pouco mais de uma tela de rolagem. Além de rolar, devolve
 * o foco ao conteúdo principal — quem navega por teclado não fica com o foco
 * perdido no fim da página. Respeita `prefers-reduced-motion`.
 *
 * Barras fixas no rodapé da tela (como o botão de reserva da página da obra)
 * publicam a própria altura em `--bottom-bar-height`, e o botão sobe junto.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * 1.2);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  function handleClick() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    document.getElementById("conteudo")?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
      className={cn(
        "on-dark fixed right-4 z-40 flex size-11 items-center justify-center bg-neabi-black text-neabi-cream shadow-lift transition-[opacity,transform] duration-200 ease-editorial hover:bg-ink-700 sm:right-6",
        "bottom-[calc(1rem+var(--bottom-bar-height,0px))] sm:bottom-[calc(1.5rem+var(--bottom-bar-height,0px))]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp aria-hidden="true" className="size-5" />
      <span className="sr-only">Voltar ao topo</span>
    </button>
  );
}
