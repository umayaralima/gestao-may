"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/** Modal do protótipo (NewTaskModal / MarkPaidModal): overlay escuro com blur, card #231431, radius 16. */
export function Modal({
  titulo,
  onClose,
  children,
  rodape,
  largura = "md",
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  largura?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "bg-superficie border border-borda rounded-2xl w-full mx-4 shadow-2xl entrar max-h-[92vh] flex flex-col",
          { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[largura],
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-borda shrink-0">
          <p className="text-sm font-semibold text-texto">{titulo}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-texto-mudo hover:text-texto-suave hover:bg-superficie-2 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">{children}</div>
        {rodape && <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-borda shrink-0">{rodape}</div>}
      </div>
    </div>
  );
}

export function BotaoCancelar({ onClick, children = "Cancelar" }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-xs text-texto-mudo hover:text-texto-suave border border-borda hover:border-borda-forte rounded-lg transition-colors"
    >
      {children}
    </button>
  );
}

export function BotaoConfirmar({
  children,
  tom = "brand",
  ...rest
}: { children: React.ReactNode; tom?: "brand" | "success" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cor = {
    brand: "bg-brand-400 hover:bg-brand-300",
    success: "bg-emerald-500 hover:bg-emerald-400",
    danger: "bg-red-500 hover:bg-red-400",
  }[tom];
  return (
    <button
      type="submit"
      {...rest}
      className={cn("px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed", cor)}
    >
      {children}
    </button>
  );
}

/** Grupo de botões de escolha única (prioridade, forma de pagamento). */
export function Escolha<T extends string>({
  opcoes,
  valor,
  onChange,
  colunas = 3,
}: {
  opcoes: Array<{ valor: T; label: React.ReactNode; dot?: string }>;
  valor: T;
  onChange: (v: T) => void;
  colunas?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors",
            valor === o.valor ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "text-texto-mudo border-borda hover:border-borda-forte hover:text-texto-suave",
          )}
        >
          {o.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.dot }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
