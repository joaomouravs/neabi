"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export interface AccountNavItem {
  href: string;
  label: string;
  exact?: boolean;
}

/**
 * Navegação lateral da área do usuário.
 *
 * Vira uma barra rolável horizontal em telas estreitas — não um menu desktop
 * espremido.
 */
export function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname();

  const isActive = (item: AccountNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav aria-label="Navegação da conta" className="lg:w-56 lg:shrink-0">
      <ul className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0 lg:shrink">
            <Link
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 font-sans text-[0.9375rem] font-medium transition-colors lg:border-b-0 lg:border-l-2 lg:px-4",
                isActive(item)
                  ? "border-neabi-red text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-900 lg:hover:border-border-strong",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <form action={logoutAction} className="mt-6 hidden lg:block">
        <button
          type="submit"
          className="px-4 font-sans text-[0.875rem] font-medium text-ink-500 underline underline-offset-4 hover:text-neabi-red-700"
        >
          Sair da conta
        </button>
      </form>
    </nav>
  );
}
