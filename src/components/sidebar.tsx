"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/*
 * Sidebar do protótipo (Figma Make, App.tsx → Sidebar): 224px, fundo #1B0F26,
 * borda #311C45, rótulos "Principal" / "Configurações", item ativo brand-400/15.
 * Nomes dos itens iguais ao Figma; Projetos é o único acréscimo (briefing e contratos vivem lá).
 */
type Item = { href: string; label: string; Icone: (p: { active: boolean }) => React.ReactElement; emBreve?: boolean };

const principal: Item[] = [
  { href: "/", label: "Dashboard", Icone: GridIcon },
  { href: "/clientes", label: "Clientes", Icone: UsersIcon },
  { href: "/pipeline", label: "Pipeline", Icone: FunnelIcon },
  { href: "/projetos", label: "Projetos", Icone: FolderIcon },
  { href: "/tarefas", label: "Tarefas", Icone: CheckIcon },
  { href: "/financeiro", label: "Financeiro", Icone: ChartIcon },
  { href: "/emails", label: "E-mails", Icone: MailIcon, emBreve: true },
];

const configuracoes: Item[] = [
  { href: "/integracoes", label: "Integrações", Icone: PlugIcon, emBreve: true },
  { href: "/configuracoes", label: "Configurações", Icone: GearIcon },
];

export function Sidebar({ email, sair, onFechar }: { email: string; sair: () => Promise<void>; onFechar?: () => void }) {
  const pathname = usePathname();

  const Nav = ({ href, label, Icone, emBreve }: Item) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    const classes = cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left",
      active ? "bg-brand-400/15 text-brand-400 font-medium" : "text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/4",
      emBreve && "opacity-50 cursor-default hover:bg-transparent hover:text-[#968F88]",
    );
    if (emBreve) {
      return (
        <span className={classes} title="Em breve">
          <Icone active={false} />
          {label}
          <span className="ml-auto text-[9px] uppercase tracking-wider">em breve</span>
        </span>
      );
    }
    return (
      <Link href={href} className={classes}>
        <Icone active={active} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex flex-col w-56 shrink-0 h-full border-r border-[#311C45] bg-[#1B0F26]">
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#311C45]">
        <Image src="/marca/logo-gradiente.png" alt="Mayara" width={531} height={131} priority className="h-7 w-auto" />
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar menu"
            className="lg:hidden w-7 h-7 rounded-md flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/8 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-2 pb-2 text-[10px] font-semibold tracking-widest text-[#968F88] uppercase">Principal</p>
        {principal.map((i) => (
          <Nav key={i.href} {...i} />
        ))}
        <p className="px-2 pt-4 pb-2 text-[10px] font-semibold tracking-widest text-[#968F88] uppercase">Configurações</p>
        {configuracoes.map((i) => (
          <Nav key={i.href} {...i} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#311C45]">
        <form action={sair} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/4 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
            MA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#DDDBD9] truncate">Mayara Lima</p>
            <p className="text-[10px] text-[#968F88] truncate">{email}</p>
          </div>
          <button type="submit" title="Sair" className="text-[#968F88] hover:text-[#DDDBD9] shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 2H2.5v9H5M8.5 9l3-2.5-3-2.5M11.5 6.5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}

/* Ícones do protótipo, 15px, traço 1.3 */
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={active ? "text-brand-400" : "text-current"}>
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "currentColor" : "none"} fillOpacity=".2" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 13c0-2.21 2.01-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12.5 9c1.1.5 1.9 1.6 1.9 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function FunnelIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 2.5h12L9 8v5L6 11.5V8L1.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 4a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.5H12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 13H3a1.5 1.5 0 0 1-1.5-1.5V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 10l2.5-3 2.5 2 2.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3.5" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function PlugIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M5 1v3M10 1v3M3 4h9a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.5 12v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
