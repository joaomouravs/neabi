"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

/**
 * Campo de busca do hero.
 *
 * Navega para `/acervo?q=…`, mantendo a busca inteiramente representada na URL
 * — resultado compartilhável, com histórico e recarregável.
 */
export function HeroSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = value.trim();
    router.push(term ? `/acervo?q=${encodeURIComponent(term)}` : "/acervo");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label htmlFor="busca-hero" className="sr-only">
        Buscar livros, autores ou temas no acervo
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id="busca-hero"
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Buscar livros, autores ou temas"
          autoComplete="off"
          className="min-h-14 w-full border border-neabi-cream/25 bg-white/[0.06] px-4 font-sans text-base text-neabi-cream placeholder:text-neabi-cream/45 focus:border-neabi-cream focus:bg-white/10 focus:outline-none sm:text-[1.0625rem]"
        />
        <Button type="submit" variant="primary" size="lg" className="sm:px-9">
          Buscar
        </Button>
      </div>
    </form>
  );
}
