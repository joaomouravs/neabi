"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface AccountNavItem {
  href: string;
  label: string;
  exact?: boolean;
}

/**
 * Abas da área da conta.
 *
 * Uma única fileira em todas as larguras — rolável no celular, nunca um menu
 * desktop espremido. `relative` dá contexto de posicionamento ao contêiner
 * rolável: sem ele, qualquer descendente absoluto escapa do recorte e faz a
 * página inteira rolar na horizontal.
 */
export function AccountNav({ items, className }: { items: AccountNavItem[]; className?: string }) {
  const pathname = usePathname();

  const isActive = (item: AccountNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav aria-label="Navegação da conta" className={cn("-mx-5 md:mx-0", className)}>
      <ul className="scrollbar-none relative flex gap-6 overflow-x-auto px-5 md:gap-8 md:px-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center whitespace-nowrap border-b-2 font-sans text-[0.9375rem] font-medium transition-colors",
                isActive(item)
                  ? "border-neabi-red-600 text-ink-900"
                  : "border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
