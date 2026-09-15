"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botão de reserva fixo no rodapé da tela, só no celular e no tablet.
 *
 * Aparece enquanto o botão principal (no cartão de disponibilidade) está fora
 * da tela, e some quando ele ou a seção de obras relacionadas entram em vista —
 * nunca cobre o próprio botão nem o rodapé. Enquanto visível, publica a altura
 * em `--bottom-bar-height` para o "voltar ao topo" subir junto.
 */
export function StickyReserveBar({
  href,
  title,
  statusLabel,
  targetId,
  stopId,
}: {
  href: string;
  title: string;
  statusLabel: string;
  targetId: string;
  stopId: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const stop = document.getElementById(stopId) ?? document.querySelector("footer");
    const desktop = window.matchMedia("(min-width: 1024px)");
    let targetInView = false;
    let stopInView = false;

    const update = () => {
      const show = !desktop.matches && !targetInView && !stopInView;
      setVisible(show);
      document.documentElement.style.setProperty(
        "--bottom-bar-height",
        show ? "4.75rem" : "0px",
      );
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === target) targetInView = entry.isIntersecting;
        else stopInView = entry.isIntersecting;
      }
      update();
    });
    if (target) observer.observe(target);
    if (stop) observer.observe(stop);
    desktop.addEventListener("change", update);

    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", update);
      document.documentElement.style.removeProperty("--bottom-bar-height");
    };
  }, [targetId, stopId]);

  return (
    <div
      // `inert` tira a barra escondida da ordem de foco e da árvore de
      // acessibilidade — não basta sumir visualmente.
      inert={!visible}
      className={cn(
        "on-dark fixed inset-x-0 bottom-0 z-40 border-t border-neabi-cream/10 bg-neabi-black px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-neabi-cream shadow-overlay transition-transform duration-200 ease-editorial lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-neabi-green-200">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-neabi-green-200" />
            {statusLabel}
          </p>
        </div>
        <Button asChild size="md" className="shrink-0">
          <Link href={href}>Reservar</Link>
        </Button>
      </div>
    </div>
  );
}
