"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const itens = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/projetos", label: "Projetos" },
  { href: "/pagamentos", label: "Pagamentos" },
];

export function Sidebar({ email, sair }: { email: string; sair: () => Promise<void> }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col bg-lavanda-900 text-lavanda-50 md:min-h-screen md:w-60">
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-rosa-300">May Lima</p>
        <p className="titulo text-2xl">Gestão</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {itens.map((item) => {
          const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-smaller px-3 py-2 text-sm whitespace-nowrap transition-colors",
                ativo ? "bg-rosa-600 text-rosa-50" : "text-lavanda-100 hover:bg-lavanda-700 hover:text-lavanda-50",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-lavanda-700 px-6 py-4 md:block">
        <p className="truncate text-xs text-lavanda-200">{email}</p>
        <form action={sair}>
          <button type="submit" className="mt-1 text-xs text-rosa-300 underline underline-offset-4 hover:text-rosa-200">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
