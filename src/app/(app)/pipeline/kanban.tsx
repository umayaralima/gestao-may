"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { BotaoPrimario, Header, Vazio, iniciais } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { ETAPA_LEAD_COR, ETAPA_LEAD_LABEL, ETAPAS_PIPELINE, PRIORIDADE_COR, PRIORIDADE_LABEL, type EtapaLead } from "@/lib/constantes";
import { diffDias, fmt, fmtK, hojeISO, rotuloDia } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { criarLead, moverLead } from "./actions";
import { LeadFormModal } from "./lead-form";

type Props = {
  leads: Lead[];
  tipos: string[];
  abrirNovo?: boolean;
  busca: React.ReactNode;
  filtro: React.ReactNode;
};

/** Tela Pipeline do protótipo: header, faixa de resumo por etapa e kanban de 5 colunas. */
export function Kanban({ leads, tipos, abrirNovo, busca, filtro }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [novo, setNovo] = useState<EtapaLead | null>(abrirNovo ? "novo" : null);

  const fecharNovo = useCallback(() => {
    setNovo(null);
    if (abrirNovo) router.replace(pathname);
  }, [abrirNovo, router, pathname]);

  const total = leads.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0);
  const colunas = ETAPAS_PIPELINE.map((etapa) => {
    const itens = leads.filter((l) => l.etapa === etapa);
    return { etapa, itens, total: itens.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0) };
  });

  return (
    <>
      {novo && <LeadFormModal action={criarLead} tipos={tipos} etapaInicial={novo} onClose={fecharNovo} />}
      <div className="flex flex-col h-full">
        <Header
          titulo="Pipeline"
          sub={
            <>
              {leads.length} negócios · <span className="font-mono">{fmt(total)}</span> no funil
            </>
          }
        >
          {busca}
          {filtro}
          <div className="w-px h-5 bg-[#311C45]" />
          <BotaoPrimario onClick={() => setNovo("novo")}>Novo negócio</BotaoPrimario>
        </Header>

        {/* Faixa de resumo: valor por etapa + barra proporcional */}
        <div className="flex items-center px-6 py-3 border-b border-[#311C45] gap-0 shrink-0 overflow-x-auto">
          {colunas.map((c, i) => {
            const pct = total > 0 ? (c.total / total) * 100 : 0;
            const cor = ETAPA_LEAD_COR[c.etapa];
            return (
              <div key={c.etapa} className="flex items-center">
                <div className="flex items-center gap-3 px-4 py-1.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-[#968F88]">{ETAPA_LEAD_LABEL[c.etapa]}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: cor }}>
                      {fmtK(c.total)}
                    </span>
                  </div>
                  <div className="h-6 w-16 bg-[#311C45] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cor, opacity: 0.7 }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#968F88]">{pct.toFixed(0)}%</span>
                </div>
                {i < colunas.length - 1 && (
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="text-[#5A496A] shrink-0">
                    <path d="M1 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {leads.length === 0 ? (
            <Vazio icone="🎯" titulo="Nenhum negócio no funil" sub="Cadastre quem entrou em contato com você." />
          ) : (
            <div className="flex gap-4 px-6 py-5 h-full" style={{ minWidth: "max-content" }}>
              {colunas.map((c, idx) => (
                <Coluna key={c.etapa} etapa={c.etapa} itens={c.itens} total={c.total} onAdicionar={() => setNovo(c.etapa)} podeVoltar={idx > 0} podeAvancar={idx < colunas.length - 1} atraso={idx * 0.05} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Coluna({
  etapa,
  itens,
  total,
  onAdicionar,
  podeVoltar,
  podeAvancar,
  atraso,
}: {
  etapa: EtapaLead;
  itens: Lead[];
  total: number;
  onAdicionar: () => void;
  podeVoltar: boolean;
  podeAvancar: boolean;
  atraso: number;
}) {
  const cor = ETAPA_LEAD_COR[etapa];
  return (
    <div className="flex flex-col w-72 shrink-0 entrar" style={{ animationDelay: `${atraso}s` }}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
          <span className="text-xs font-semibold text-[#DDDBD9]">{ETAPA_LEAD_LABEL[etapa]}</span>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `${cor}20`, color: cor }}>
            {itens.length}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#968F88]">{fmt(total)}</span>
      </div>
      <div className="h-0.5 rounded-full mb-3 mx-1" style={{ backgroundColor: `${cor}30` }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: cor, width: `${Math.min(100, (itens.length / 5) * 100)}%` }} />
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {itens.map((l) => (
          <CardNegocio key={l.id} lead={l} cor={cor} podeVoltar={podeVoltar} podeAvancar={podeAvancar} />
        ))}
        <button
          type="button"
          onClick={onAdicionar}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#311C45] rounded-xl text-[11px] text-[#968F88] hover:text-[#C5C2BE] hover:border-[#5A496A] transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Adicionar negócio
        </button>
      </div>
    </div>
  );
}

function CardNegocio({ lead, cor, podeVoltar, podeAvancar }: { lead: Lead; cor: string; podeVoltar: boolean; podeAvancar: boolean }) {
  const [pending, startTransition] = useTransition();
  const dias = diffDias(lead.atualizado_em.slice(0, 10), hojeISO());
  const parado = dias > 10;
  const followAtrasado = !!lead.proximo_followup && lead.proximo_followup < hojeISO();
  const mover = (d: "prev" | "next") => startTransition(() => moverLead(lead.id, d));

  return (
    <Link
      href={`/pipeline/${lead.id}`}
      className={cn(
        "block bg-[#231431] border border-[#311C45] rounded-xl p-4 cursor-pointer hover:border-[#5A496A] transition-all duration-150 group select-none",
        pending && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: `${cor}18`, border: `1px solid ${cor}30`, color: cor }}>
            {iniciais(lead.empresa ?? lead.nome)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#DDDBD9] leading-tight truncate">{lead.empresa ?? lead.nome}</p>
            <p className="text-[10px] text-[#968F88] mt-0.5 truncate">{lead.empresa ? lead.nome : lead.servico_interesse ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {podeVoltar && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                mover("prev");
              }}
              title="Mover para etapa anterior"
              className="w-5 h-5 rounded flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/8 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {podeAvancar && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                mover("next");
              }}
              title="Mover para próxima etapa"
              className="w-5 h-5 rounded flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/8 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M4 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-base font-semibold text-[#F5F5F4] font-mono mb-3">{lead.valor_estimado !== null ? fmt(lead.valor_estimado) : "—"}</p>

      {lead.servico_interesse && lead.empresa && (
        <div className="flex flex-wrap gap-1 mb-3">
          <span className="px-1.5 py-0.5 rounded text-[10px] text-[#968F88] bg-[#311C45] border border-[#5A496A]">{lead.servico_interesse}</span>
        </div>
      )}

      <div className={cn("flex items-center gap-1.5 mb-3 p-2 rounded-lg bg-[#150C1D]", followAtrasado && "ring-1 ring-red-500/40")}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={cn("shrink-0", followAtrasado ? "text-red-400" : "text-[#968F88]")}>
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] text-[#C5C2BE] flex-1 truncate">{lead.nota_followup ?? (lead.proximo_followup ? "Follow-up" : "Sem próxima ação")}</span>
        {lead.proximo_followup && (
          <span className={cn("text-[10px] font-mono shrink-0", followAtrasado ? "text-red-400" : "text-[#968F88]")}>{rotuloDia(lead.proximo_followup)}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORIDADE_COR[lead.prioridade] }} />
          <span className="text-[10px] font-medium" style={{ color: PRIORIDADE_COR[lead.prioridade] }}>
            {PRIORIDADE_LABEL[lead.prioridade]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {parado ? (
            <span className="text-[10px] text-amber-400 font-mono" title="Há muito tempo nesta etapa">
              ⚠ {dias}d
            </span>
          ) : (
            dias > 0 && <span className="text-[10px] text-[#968F88] font-mono">{dias}d</span>
          )}
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 flex items-center justify-center text-[9px] font-bold text-white" title="Mayara">
            MA
          </div>
        </div>
      </div>
    </Link>
  );
}
