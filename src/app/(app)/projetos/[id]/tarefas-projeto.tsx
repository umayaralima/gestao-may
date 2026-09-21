"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { PRIORIDADE_COR } from "@/lib/constantes";
import { diffDias, fmtData, hojeISO } from "@/lib/format";
import type { CategoriaTarefa, Tarefa } from "@/lib/types";
import { alternarTarefa } from "@/app/(app)/tarefas/actions";

/** Lista compacta das tarefas do projeto (aba Visão geral), com o mesmo checkbox da tela Tarefas. */
export function TarefasProjeto({ tarefas, categorias }: { tarefas: Tarefa[]; categorias: CategoriaTarefa[] }) {
  const icones = Object.fromEntries(categorias.map((c) => [c.nome, c.icone]));
  const hoje = hojeISO();
  const pendentes = tarefas.filter((t) => !t.concluida_em);
  const feitas = tarefas.filter((t) => t.concluida_em);
  const progresso = tarefas.length ? Math.round((feitas.length / tarefas.length) * 100) : 0;

  if (tarefas.length === 0) return <p className="text-xs text-[#5A496A]">Nenhuma tarefa ainda. Crie as etapas de produção por aqui.</p>;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-[#968F88]">
            {feitas.length} de {tarefas.length} concluídas
          </span>
          <span className="text-[10px] font-mono text-brand-400">{progresso}%</span>
        </div>
        <div className="h-1 bg-[#311C45] rounded-full overflow-hidden">
          <div className="h-full bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-[#311C45]/60">
        {[...pendentes, ...feitas].map((t) => {
          const dias = t.vencimento ? diffDias(hoje, t.vencimento) : null;
          const atrasada = !t.concluida_em && dias !== null && dias < 0;
          return <Linha key={t.id} t={t} icone={icones[t.categoria] ?? "•"} atrasada={atrasada} />;
        })}
      </ul>
    </div>
  );
}

function Linha({ t, icone, atrasada }: { t: Tarefa; icone: string; atrasada: boolean }) {
  const [pending, start] = useTransition();
  const feita = !!t.concluida_em;
  return (
    <li className={cn("flex items-center gap-3 py-2.5", pending && "opacity-50")}>
      <button
        type="button"
        onClick={() => start(() => alternarTarefa(t.id, !feita))}
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          feita ? "bg-brand-400 border-brand-400" : "border-[#5A496A] hover:border-brand-400",
        )}
        title={feita ? "Reabrir" : "Concluir"}
      >
        {feita && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 4.5l2.5 2.5 4-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORIDADE_COR[t.prioridade] }} />
      <span className={cn("flex-1 min-w-0 text-xs truncate", feita ? "line-through text-[#968F88]" : "text-[#DDDBD9]")}>{t.titulo}</span>
      <span className="text-[10px] text-[#968F88] whitespace-nowrap hidden sm:inline">
        {icone} {t.categoria}
      </span>
      {t.vencimento && (
        <span className={cn("text-[10px] font-mono whitespace-nowrap", atrasada ? "text-red-400" : "text-[#968F88]")}>{fmtData(t.vencimento, false)}</span>
      )}
    </li>
  );
}
