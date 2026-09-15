"use client";

import { Search } from "lucide-react";
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
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
        />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 w-full border border-ink-900/20 bg-white pl-9 pr-3 text-base text-ink-900 transition-colors placeholder:text-ink-500 hover:border-ink-900/40 focus:border-ink-900 focus-visible:outline-2 sm:text-[0.875rem]"
        />
      </label>
      <Button type="submit" variant="outline" className="shrink-0">
        Buscar
      </Button>
    </form>
  );
}
