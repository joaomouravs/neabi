"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

/**
 * Campo de busca das listagens administrativas.
 *
 * Escreve na URL, como no catálogo público: a equipe pode salvar ou compartilhar
 * o link de uma consulta específica.
 */
export function AdminSearch({
  placeholder,
  defaultValue,
}: {
  placeholder: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  const [lastFromUrl, setLastFromUrl] = useState(defaultValue);
  if (defaultValue !== lastFromUrl) {
    setLastFromUrl(defaultValue);
    setValue(defaultValue);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const term = value.trim();
    if (term) params.set("q", term);
    else params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex gap-2">
      <label className="flex-1">
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="min-h-10 w-full border border-ink-900/20 bg-white px-3 text-[0.875rem] text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none"
        />
      </label>
      <Button type="submit" variant="outline" size="sm">
        Buscar
      </Button>
    </form>
  );
}
