"use client";

import { cn } from "@/lib/cn";

/*
 * Alterna claro/escuro. Mesma ideia da sidebar recolhível: o estado vive num
 * atributo no <html> (escrito antes do primeiro paint, em layout.tsx) e só o CSS
 * reage a ele — inclusive o ícone deste botão. Zero estado no React, então não
 * há piscada ao carregar nem divergência entre servidor e cliente.
 */
export function BotaoTema({ variante = "sidebar", className }: { variante?: "sidebar" | "flutuante"; className?: string }) {
  const alternar = () => {
    const html = document.documentElement;
    const novo = html.dataset.tema === "claro" ? "escuro" : "claro";
    html.dataset.tema = novo;
    try {
      localStorage.setItem("tema", novo);
    } catch {
      // navegação privada: o tema vale só nesta aba, e tudo bem
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema claro e escuro"
      title="Alternar tema claro e escuro"
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors",
        variante === "sidebar"
          ? "w-7 h-7 text-texto-mudo hover:text-texto-suave hover:bg-superficie-2"
          : "w-9 h-9 border border-borda bg-superficie text-texto-mudo hover:text-texto-suave hover:border-borda-forte",
        className,
      )}
    >
      {/* Sol = "ir pro claro" (aparece no tema escuro); Lua = "ir pro escuro" */}
      <svg className="tema-icone-sol" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 2.6v2.1M12 19.3v2.1M21.4 12h-2.1M4.7 12H2.6M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5M18.6 18.6l-1.5-1.5M6.9 6.9L5.4 5.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <svg className="tema-icone-lua" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
