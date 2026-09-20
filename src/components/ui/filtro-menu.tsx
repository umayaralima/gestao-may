"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type OpcaoFiltro = { valor: string; label: string; cor?: string };

/*
 * Menu hambúrguer "Filtrar" da tela Clientes do protótipo. Pedido da May: nos topos de
 * cada seção, os filtros são esse menu, não uma fileira de botões.
 * Escreve o valor na URL (?param=valor) pra página server-side filtrar.
 * O dropdown é renderizado por portal em position:fixed, então nenhum overflow/z-index
 * das barras (ex.: a Subbar rolável de Tarefas) consegue recortá-lo.
 */
export function FiltroMenu({
  param,
  opcoes,
  rotulo = "Filtrar",
  todos = "",
}: {
  param: string;
  opcoes: OpcaoFiltro[];
  rotulo?: string;
  /** valor que significa "sem filtro" (padrão: string vazia / ausente) */
  todos?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const atual = params.get(param) ?? todos;
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Posiciona o menu logo abaixo do botão e reposiciona em scroll/resize
  useLayoutEffect(() => {
    if (!aberto) return;
    const medir = () => {
      const r = botaoRef.current?.getBoundingClientRect();
      if (!r) return;
      const larguraMenu = 180;
      const left = Math.min(r.left, window.innerWidth - larguraMenu - 8);
      setPos({ top: r.bottom + 4, left: Math.max(8, left) });
    };
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!botaoRef.current?.contains(alvo) && !menuRef.current?.contains(alvo)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const aplicar = (valor: string) => {
    const next = new URLSearchParams(params.toString());
    if (valor === todos) next.delete(param);
    else next.set(param, valor);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`);
    setAberto(false);
  };

  const ativo = atual !== todos;
  const labelAtual = opcoes.find((o) => o.valor === atual)?.label;

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap",
          aberto || ativo
            ? "bg-brand-400/15 text-brand-400 border-brand-400/30"
            : "text-[#968F88] border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9]",
        )}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {ativo ? labelAtual : rotulo}
        {ativo && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              aplicar(todos);
            }}
            className="ml-1 text-[#968F88] hover:text-red-400 transition-colors"
          >
            ×
          </span>
        )}
      </button>

      {aberto &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[60] bg-[#231431] border border-[#311C45] rounded-xl shadow-xl py-1.5 min-w-[160px] entrar"
          >
            {opcoes.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => aplicar(o.valor)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors",
                  atual === o.valor ? "text-brand-400 bg-brand-400/10" : "text-[#C5C2BE] hover:bg-white/4",
                )}
              >
                {o.cor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: o.cor }} />}
                {o.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
