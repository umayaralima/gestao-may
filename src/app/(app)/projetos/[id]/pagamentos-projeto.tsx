"use client";

import { useState, useTransition } from "react";
import { BotaoGhost, Pill, Th, Vazio } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { FORMA_PAGAMENTO_LABEL, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { fmt, fmtData } from "@/lib/format";
import type { Pagamento } from "@/lib/types";
import { desfazerPagamento, excluirPagamento, marcarComoPago } from "../../financeiro/actions";
import { Escolha, Modal } from "@/components/ui/modal";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";

const ICONE_FORMA: Record<string, string> = { pix: "⚡", transferencia: "🏦", boleto: "📄", cartao: "💳", outro: "💰" };

/** Aba Pagamentos do projeto: mesma tabela do Financeiro, filtrada. */
export function PagamentosProjeto({ pagamentos, projetoId }: { pagamentos: Pagamento[]; projetoId: string }) {
  const [pagando, setPagando] = useState<Pagamento | null>(null);

  return (
    <>
      {pagando && <MarcarPago p={pagando} onClose={() => setPagando(null)} />}
      <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#311C45]">
          <div>
            <p className="text-sm font-semibold text-[#F5F5F4]">Parcelas</p>
            <p className="text-xs text-[#968F88]">{pagamentos.length} lançamento(s)</p>
          </div>
          <BotaoGhost href={`/financeiro?novo=1&projeto=${projetoId}`}>+ Lançamento</BotaoGhost>
        </div>
        {pagamentos.length === 0 ? (
          <Vazio icone="💰" titulo="Nenhuma parcela cadastrada" sub="Adicione a entrada, parcelas e o pagamento final." />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#311C45]">
                {["Tipo", "Vencimento", "Pagamento", "Valor", "Status", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <Linha key={p.id} p={p} onPagar={() => setPagando(p)} />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

function Linha({ p, onPagar }: { p: Pagamento; onPagar: () => void }) {
  const [pending, startTransition] = useTransition();
  const vencido = p.status === "atrasado";
  const pago = p.status === "pago";
  return (
    <tr className={cn("border-b border-[#311C45]/50 last:border-0 hover:bg-white/[0.02] transition-colors", pending && "opacity-40")}>
      <td className="px-5 py-3.5 text-xs text-[#C5C2BE]">{p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : "—"}</td>
      <td className={cn("px-5 py-3.5 text-[11px] font-mono", vencido ? "text-red-400" : "text-[#968F88]")}>{fmtData(p.vencimento)}</td>
      <td className="px-5 py-3.5 text-[11px] font-mono text-[#968F88]">
        {p.data_pagamento ? (
          <>
            {fmtData(p.data_pagamento)}
            {p.forma_pagamento && <span className="ml-1.5 text-[10px]">{ICONE_FORMA[p.forma_pagamento]} {FORMA_PAGAMENTO_LABEL[p.forma_pagamento as keyof typeof FORMA_PAGAMENTO_LABEL]}</span>}
          </>
        ) : (
          <span className="text-[#5A496A]">—</span>
        )}
      </td>
      <td className={cn("px-5 py-3.5 text-sm font-semibold font-mono", pago ? "text-emerald-400" : vencido ? "text-red-400" : "text-[#DDDBD9]")}>{fmt(p.valor)}</td>
      <td className="px-5 py-3.5">{pago ? <Pill tom="success">Pago</Pill> : vencido ? <Pill tom="error">Vencido</Pill> : <Pill tom="warning">Pendente</Pill>}</td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {pago ? (
            <button type="button" onClick={() => startTransition(() => desfazerPagamento(p.id, p.projeto_id))} className="px-2.5 py-1 text-[11px] text-[#968F88] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
              Desfazer
            </button>
          ) : (
            <button type="button" onClick={onPagar} className="px-2.5 py-1 text-[11px] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors">
              Marcar pago
            </button>
          )}
          <button type="button" onClick={() => confirm("Excluir esta parcela?") && startTransition(() => excluirPagamento(p.id, p.projeto_id))} className="w-6 h-6 rounded flex items-center justify-center text-[#5A496A] hover:text-red-400 transition-colors" title="Excluir">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function MarcarPago({ p, onClose }: { p: Pagamento; onClose: () => void }) {
  const [forma, setForma] = useState<string>(p.forma_pagamento ?? "pix");
  const [pending, startTransition] = useTransition();
  return (
    <Modal titulo="Confirmar pagamento" onClose={onClose} largura="sm">
      <div className="bg-[#1B0F26] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#DDDBD9]">{p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : "Parcela"}</p>
        <p className="text-[11px] text-[#968F88] mt-0.5">Vencimento {fmtData(p.vencimento)}</p>
        <p className="text-lg font-semibold font-mono text-emerald-400 mt-2">{fmt(p.valor)}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] block mb-2">Forma de pagamento</p>
        <Escolha opcoes={FORMAS_PAGAMENTO.map((f) => ({ valor: f, label: `${ICONE_FORMA[f]} ${FORMA_PAGAMENTO_LABEL[f]}` }))} valor={forma} onChange={setForma} colunas={3} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await marcarComoPago(p.id, p.projeto_id, forma);
              onClose();
            })
          }
          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {pending ? "Confirmando…" : "Confirmar recebimento"}
        </button>
      </div>
    </Modal>
  );
}
