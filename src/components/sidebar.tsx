"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FolderKanban, LayoutDashboard, LogOut, Settings, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Sidebar no padrão do wireframe do Figma (4037:1234): 224px, logo no topo,
 * seções "Principal" e "Configurações" em rótulo caixa alta, item ativo em rosa-600,
 * rodapé com usuário e sair.
 */
const principal = [
  { href: "/", label: "Dashboard", Icone: LayoutDashboard },
  { href: "/leads", label: "Leads", Icone: Users },
  { href: "/clientes", label: "Clientes", Icone: UserRound },
  { href: "/projetos", label: "Projetos", Icone: FolderKanban },
  { href: "/pagamentos", label: "Pagamentos", Icone: CreditCard },
];

const configuracoes = [{ href: "/configuracoes", label: "Configurações", Icone: Settings }];

export function Sidebar({ email, sair }: { email: string; sair: () => Promise<void> }) {
  const pathname = usePathname();
  const iniciais = email.slice(0, 2).toUpperCase();

  const Item = ({ href, label, Icone }: (typeof principal)[number]) => {
    const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm whitespace-nowrap transition-colors",
          ativo ? "bg-rosa-600 text-rosa-50" : "text-texto-suave hover:bg-superficie-2 hover:text-texto",
        )}
      >
        <Icone className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex w-full flex-col border-b border-borda bg-fundo md:sticky md:top-0 md:h-screen md:w-56 md:border-r md:border-b-0">
      <div className="flex items-center border-b border-borda px-5 py-4">
        <Image src="/marca/logo-gradiente.png" alt="Mayara" width={531} height={131} priority className="h-9 w-auto" />
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-col md:px-3 md:py-4">
        <p className="rotulo mb-2 hidden px-3 md:block">Principal</p>
        {principal.map((i) => (
          <Item key={i.href} {...i} />
        ))}
        <p className="rotulo mt-5 mb-2 hidden px-3 md:block">Configurações</p>
        {configuracoes.map((i) => (
          <Item key={i.href} {...i} />
        ))}
      </nav>

      <div className="mt-auto hidden items-center gap-3 border-t border-borda px-4 py-4 md:flex">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rosa-600 text-xs font-semibold text-rosa-50">
          {iniciais}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-texto">May</p>
          <p className="truncate text-[11px] text-texto-mudo">{email}</p>
        </div>
        <form action={sair}>
          <button type="submit" title="Sair" className="rounded-[6px] p-1.5 text-texto-mudo hover:bg-superficie-2 hover:text-texto">
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  );
}
