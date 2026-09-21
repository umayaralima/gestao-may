"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { BotaoGhost, Card, CardTitulo, Input, MensagemErro, Select } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { GRUPO_CATEGORIA_LABEL, GRUPOS_CATEGORIA, PRIORIDADE_COR } from "@/lib/constantes";
import { diffDias, fmtData, hojeISO } from "@/lib/format";
import type { CategoriaTarefa, Tarefa } from "@/lib/types";
import { alternarTarefa, excluirTarefa } from "@/app/(app)/tarefas/actions";
import { criarEtapa, gerarEtapasDoModelo, type FormState } from "../actions";

/*
 * Aba Etapas do projeto: checklist de produção. As etapas são tarefas com `projeto_id` + `ordem`,
 * geradas do modelo por tipo de serviço (Configurações → Listas) ou criadas à mão aqui.
 */
export function EtapasProjeto({ projetoId, tipo, tarefas, categorias }: { projetoId: string; tipo: string | null; tarefas: Tarefa[]; categorias: CategoriaTarefa[] }) {
  const icones = Object.fromEntries(categorias.map((c) => [c.nome, c.icone]));
  const hoje = hojeISO();
  const ordenadas = [...tarefas].sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999) || (a.vencimento ?? "9999").localeCompare(b.vencimento ?? "9999"));
  const feitas = ordenadas.filter((t) => t.concluida_em).length;
  const pct = ordenadas.length ? Math.round((feitas / ordenadas.length) * 100) : 0;
  const atrasadas = ordenadas.filter((t) => !t.concluida_em && t.vencimento && t.vencimento < hoje).length;
  const temEtapas = ordenadas.some((t) => t.ordem !== null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitulo sub={ordenadas.length ? `${feitas} de ${ordenadas.length} concluídas${atrasadas ? ` · ${atrasadas} atrasada(s)` : ""}` : "Nenhuma etapa ainda"}>Progresso da produção</CardTitulo>
          <div className="flex items-center gap-2">
            {!temEtapas && <GerarEtapas projetoId={projetoId} tipo={tipo} />}
            <BotaoGhost href={`/tarefas?nova=1&projeto=${projetoId}`}>+ Tarefa completa</BotaoGhost>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-[#311C45] rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-400" : "bg-brand-400")} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("text-xs font-mono", pct === 100 ? "text-emerald-400" : "text-brand-400")}>{pct}%</span>
        </div>
      </Card>

      <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
        {ordenadas.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-[#968F88]">
            {tipo ? `Gere as etapas padrão de "${tipo}" ou adicione a primeira abaixo.` : "Defina o tipo de serviço do projeto (Editar) pra gerar as etapas padrão, ou adicione abaixo."}
          </p>
        ) : (
          <ol className="divide-y divide-[#311C45]/60">
            {ordenadas.map((t, i) => (
              <Etapa key={t.id} t={t} numero={i + 1} icone={icones[t.categoria] ?? "•"} atrasada={!t.concluida_em && !!t.vencimento && t.vencimento < hoje} />
            ))}
          </ol>
        )}
        <div className="border-t border-[#311C45] px-5 py-4">
          <NovaEtapaForm projetoId={projetoId} categorias={categorias} />
        </div>
      </div>
    </div>
  );
}

function GerarEtapas({ projetoId, tipo }: { projetoId: string; tipo: string | null }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || !tipo}
        onClick={() =>
          start(async () => {
            const r = await gerarEtapasDoModelo(projetoId);
            setErro(r.erro ?? null);
          })
        }
        className="px-3 py-2 bg-brand-400/15 text-brand-400 border border-brand-400/30 hover:bg-brand-400/25 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
        title={tipo ? `Cria as etapas padrão de ${tipo}` : "Defina o tipo de serviço primeiro"}
      >
        {pending ? "Gerando…" : `Gerar etapas padrão${tipo ? ` · ${tipo}` : ""}`}
      </button>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}

function Etapa({ t, numero, icone, atrasada }: { t: Tarefa; numero: number; icone: string; atrasada: boolean }) {
  const [pending, start] = useTransition();
  const feita = !!t.concluida_em;
  const hoje = hojeISO();
  const dias = t.vencimento ? diffDias(hoje, t.vencimento) : null;
  return (
    <li className={cn("group flex items-center gap-3 px-5 py-3", pending && "opacity-50")}>
      <span className="w-5 text-[10px] font-mono text-[#5A496A] text-right shrink-0">{numero}</span>
      <button
        type="button"
        onClick={() => start(() => alternarTarefa(t.id, !feita))}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          feita ? "bg-emerald-500 border-emerald-500" : atrasada ? "border-red-400 hover:border-red-300" : "border-[#5A496A] hover:border-brand-400",
        )}
        title={feita ? "Reabrir" : "Concluir"}
      >
        {feita && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2.5 2.5 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", feita ? "line-through text-[#968F88]" : "text-[#DDDBD9]")}>{t.titulo}</p>
        <p className="text-[10px] text-[#968F88] truncate">
          {icone} {t.categoria}
          {t.descricao && <span className="text-[#5A496A]"> · {t.descricao}</span>}
        </p>
      </div>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORIDADE_COR[t.prioridade] }} title={`Prioridade ${t.prioridade}`} />
      {t.vencimento && (
        <span className={cn("text-[11px] font-mono whitespace-nowrap", feita ? "text-[#5A496A]" : atrasada ? "text-red-400" : dias !== null && dias <= 2 ? "text-amber-400" : "text-[#968F88]")}>
          {feita ? fmtData(t.concluida_em, false) : atrasada ? `${Math.abs(dias!)}d atrás` : dias === 0 ? "hoje" : fmtData(t.vencimento, false)}
        </span>
      )}
      <Link href={`/tarefas?q=${encodeURIComponent(t.titulo)}`} className="opacity-0 group-hover:opacity-100 text-[10px] text-[#968F88] hover:text-brand-400 transition-all" title="Editar na tela Tarefas">
        editar
      </Link>
      <button
        type="button"
        onClick={() => start(() => excluirTarefa(t.id))}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-[#968F88] hover:text-red-400 transition-all shrink-0"
        title="Excluir etapa"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}

function NovaEtapaForm({ projetoId, categorias }: { projetoId: string; categorias: CategoriaTarefa[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(criarEtapa.bind(null, projetoId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const padrao = categorias.find((c) => c.grupo === "producao")?.nome ?? "Outro";

  return (
    <form ref={ref} action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[180px]">
          <Input name="titulo" placeholder="Nova etapa, ex.: Ajustes finais" required className="py-2 text-xs" />
        </div>
        <div className="w-44">
          <Select name="categoria" defaultValue={padrao} className="py-2 text-xs">
            {GRUPOS_CATEGORIA.map((g) => (
              <optgroup key={g} label={GRUPO_CATEGORIA_LABEL[g]}>
                {categorias
                  .filter((c) => c.grupo === g)
                  .map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.icone} {c.nome}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Input name="vencimento" type="date" className="py-2 text-xs" />
        </div>
        <BotaoConfirmar disabled={pending}>{pending ? "…" : "Adicionar"}</BotaoConfirmar>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
    </form>
  );
}
