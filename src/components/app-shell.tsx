"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Sidebar } from "@/components/sidebar";

/*
 * Shell responsivo: em telas grandes (lg+) a sidebar fica fixa à esquerda como no protótipo;
 * abaixo disso ela vira uma gaveta aberta por uma barra superior com hambúrguer + logo.
 * A gaveta fecha ao clicar num link, no fundo escurecido ou com Esc.
 */
export function AppShell({ email, nome, titulo, sair, children }: { email: string; nome: string; titulo: string; sair: () => Promise<void>; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  return (
    <div className="flex h-dvh bg-[#150C1D] overflow-hidden">
      {/* Fundo escurecido da gaveta (só mobile) */}
      <div
        onClick={() => setAberto(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          aberto ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAberto(false);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:transition-none",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar email={email} nome={nome} titulo={titulo} sair={sair} onFechar={() => setAberto(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior só no mobile */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[#311C45] bg-[#1B0F26] shrink-0 lg:hidden">
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <Image src="/marca/logo-gradiente.png" alt="Mayara" width={531} height={131} priority className="h-6 w-auto" />
        </div>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
