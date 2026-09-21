"use client";

import Link from "next/link";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { PRIORIDADE_COR } from "@/lib/constantes";
import { diffDias, fmtData, hojeISO } from "@/lib/format";
import type { CategoriaTarefa, Tarefa } from "@/lib/types";
import { alternarTarefa } from "@/app/(app)/tarefas/actions";

type Item = Tarefa & { projetoNome: string | null };

/** Próximas tarefas do cliente (diretas + dos projetos), com checkbox; concluídas ficam fora. */
export function TarefasCliente({ tarefas, categorias }: { tarefas: Item[]; categorias: CategoriaTarefa[] }) {
  const icones = Object.fromEntries(categorias.map((c) => [c.nome, c.icone]));
  const hoje = hojeISO();
  const abertas = tarefas.filter((t) => !t.concluida_em).sort((a, b) => (a.vencimento ?? "9999").localeCompare(b.vencimento ?? "9999")).slice(0, 8);

  if (abertas.length === 0) return <p className="text-xs text-[#5A496A]">Nada pendente pra este cliente.</p>;

  return (
    <ul className="divide-y divide-[#311C45]/60">
      {abertas.map((t) => {
        const dias = t.vencimento ? diffDias(hoje, t.vencimento) : null;
        return <Linha key={t.id} t={t} icone={icones[t.categoria] ?? "•"} atrasada={dias !== null && dias < 0} />;
      })}
      {tarefas.filter((t) => !t.concluida_em).length > 8 && (
        <li className="pt-2">
          <Link href="/tarefas" className="text-[11px] text-brand-400 hover:text-brand-300">
            Ver todas em Tarefas →
          </Link>
        </li>
      )}
    </ul>
  );
}

function Linha({ t, icone, atrasada }: { t: Item; icone: string; atrasada: boolean }) {
  const [pending, start] = useTransition();
  return (
    <li className={cn("flex items-center gap-3 py-2.5", pending && "opacity-50")}>
      <button
        type="button"
        onClick={() => start(() => alternarTarefa(t.id, true))}
        className="w-4 h-4 rounded-full border-2 border-[#5A496A] hover:border-brand-400 shrink-0 transition-colors"
        title="Concluir"
      />
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORIDADE_COR[t.prioridade] }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#DDDBD9] truncate">{t.titulo}</p>
        <p className="text-[10px] text-[#968F88] truncate">
          {icone} {t.categoria}
          {t.projetoNome && (
            <>
              {" "}
              · <Link href={`/projetos/${t.projeto_id}`} className="hover:text-brand-400">{t.projetoNome}</Link>
            </>
          )}
        </p>
      </div>
      {t.vencimento && <span className={cn("text-[10px] font-mono whitespace-nowrap", atrasada ? "text-red-400" : "text-[#968F88]")}>{fmtData(t.vencimento, false)}</span>}
    </li>
  );
}
