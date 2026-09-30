"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { conferirCobranca, gerarLinkCobranca, removerLinkCobranca } from "./actions";

/*
 * Link de cobrança da InfinitePay na linha da parcela: gerar, copiar, mandar no WhatsApp
 * e conferir o pagamento. A baixa automática vem pelo webhook; o botão "Conferir" é o plano B.
 */
export function BotoesCobranca({
  pagamentoId,
  projetoId,
  link,
  temHandle,
  whatsapp,
  clienteNome,
  descricao,
  valorFormatado,
}: {
  pagamentoId: string;
  projetoId: string;
  link: string | null;
  temHandle: boolean;
  whatsapp: string | null;
  clienteNome: string;
  descricao: string;
  valorFormatado: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!temHandle) return null;

  const copiar = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const mensagem = link
    ? `Oi, ${clienteNome.split(" ")[0]}! Segue o link pra pagamento de ${valorFormatado} (${descricao}): ${link}`
    : "";
  const zap = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}` : null;

  return (
    <div className="flex items-center gap-1.5">
      {!link ? (
        <button
          type="button"
          disabled={pendente}
          onClick={() => iniciar(async () => setErro((await gerarLinkCobranca(pagamentoId, projetoId)).erro ?? null))}
          className={cn("px-2.5 py-1 text-[11px] text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors whitespace-nowrap", pendente && "opacity-50")}
          title="Gerar link de pagamento da InfinitePay"
        >
          {pendente ? "Gerando…" : "Gerar cobrança"}
        </button>
      ) : (
        <>
          <button type="button" onClick={copiar} className="px-2.5 py-1 text-[11px] text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors whitespace-nowrap" title={link}>
            {copiado ? "Copiado ✓" : "Copiar link"}
          </button>
          {zap && (
            <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-1 text-[11px] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors whitespace-nowrap">
              WhatsApp
            </a>
          )}
          <button
            type="button"
            disabled={pendente}
            onClick={() => iniciar(async () => setErro((await conferirCobranca(pagamentoId, projetoId)).erro ?? null))}
            className="w-6 h-6 rounded flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] transition-colors"
            title="Conferir pagamento na InfinitePay"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M10.5 6a4.5 4.5 0 1 1-1.3-3.2M10.5 1.5V4H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => confirm("Remover o link desta parcela?") && iniciar(() => removerLinkCobranca(pagamentoId, projetoId))}
            className="w-6 h-6 rounded flex items-center justify-center text-[#5A496A] hover:text-red-400 transition-colors"
            title="Remover link"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}
      {erro && <span className="text-[10px] text-red-400 max-w-[180px] truncate" title={erro}>{erro}</span>}
    </div>
  );
}
