"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Input, MensagemErro, Select } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { GRUPO_CATEGORIA_LABEL, GRUPOS_CATEGORIA } from "@/lib/constantes";
import type { CategoriaTarefa, EtapaModelo, TipoProjeto } from "@/lib/types";
import { atualizarEtapaModelo, criarEtapaModelo, excluirEtapaModelo, type FormState } from "./actions";

/** Input "de linha" das listas (mesmo visual do editor de tipos/categorias). */
const campoLinha =
  "rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-[#DDDBD9] hover:border-[#311C45] focus:border-brand-400/60 focus:bg-[#150C1D] focus:outline-none transition-colors";

/**
 * Editor das etapas padrão por tipo de serviço. Cada tipo é um bloco recolhível;
 * cada etapa tem ordem, nome, categoria e "dias após o início" (vira o prazo da tarefa).
 */
export function EtapasModeloEditor({ tipos, etapas, categorias }: { tipos: TipoProjeto[]; etapas: EtapaModelo[]; categorias: CategoriaTarefa[] }) {
  const [aberto, setAberto] = useState<string | null>(tipos[0]?.nome ?? null);

  return (
    <div>
      {tipos.map((tipo) => {
        const lista = etapas.filter((e) => e.tipo_projeto === tipo.nome).sort((a, b) => a.ordem - b.ordem);
        const ativo = aberto === tipo.nome;
        return (
          <div key={tipo.id} className="border-b border-[#311C45]/60 last:border-b-0">
            <button type="button" onClick={() => setAberto(ativo ? null : tipo.nome)} className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-white/[0.02] transition-colors">
              <span className="text-sm text-[#DDDBD9] font-medium">{tipo.nome}</span>
              <span className="text-[10px] font-mono text-[#968F88]">
                {lista.length} etapa(s){lista.length ? ` · ~${Math.max(...lista.map((e) => e.dias_apos_inicio))} dias` : ""} <span className="ml-2">{ativo ? "−" : "+"}</span>
              </span>
            </button>
            {ativo && (
              <div className="pb-4">
                {lista.length === 0 && <p className="px-6 py-2 text-xs text-[#5A496A]">Nenhuma etapa padrão. Adicione abaixo.</p>}
                {lista.map((e) => (
                  <form key={e.id} action={atualizarEtapaModelo.bind(null, e.id)} className="flex items-center gap-2 px-6 py-1">
                    <input name="ordem" type="number" min={0} defaultValue={e.ordem} className={cn(campoLinha, "w-12 text-center font-mono text-xs shrink-0")} title="Ordem" />
                    <input name="nome" defaultValue={e.nome} maxLength={120} className={cn(campoLinha, "flex-1 min-w-0")} />
                    <select name="categoria" defaultValue={e.categoria} className={cn(campoLinha, "w-40 shrink-0 cursor-pointer text-xs hidden md:block")}>
                      <CategoriasOpcoes categorias={categorias} />
                    </select>
                    <div className="flex items-center gap-1 shrink-0">
                      <input name="dias_apos_inicio" type="number" min={0} max={365} defaultValue={e.dias_apos_inicio} className={cn(campoLinha, "w-14 text-center font-mono text-xs")} title="Dias após o início do projeto" />
                      <span className="text-[10px] text-[#968F88] hidden sm:inline">dias</span>
                    </div>
                    <button type="submit" className="px-2.5 py-1 text-[11px] text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors shrink-0">
                      Salvar
                    </button>
                    <button type="submit" formAction={excluirEtapaModelo.bind(null, e.id)} className="text-[#5A496A] hover:text-red-400 transition-colors text-xs shrink-0" title="Remover etapa">
                      ×
                    </button>
                  </form>
                ))}
                <div className="px-6 pt-3">
                  <NovaEtapaModeloForm tipo={tipo.nome} categorias={categorias} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CategoriasOpcoes({ categorias }: { categorias: CategoriaTarefa[] }) {
  return (
    <>
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
    </>
  );
}

function NovaEtapaModeloForm({ tipo, categorias }: { tipo: string; categorias: CategoriaTarefa[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(criarEtapaModelo, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const padrao = categorias.find((c) => c.grupo === "producao")?.nome ?? "Outro";

  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="tipo_projeto" value={tipo} />
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[160px]">
          <Input name="nome" placeholder={`Nova etapa de ${tipo}`} required maxLength={120} className="py-2 text-xs" />
        </div>
        <div className="w-44">
          <Select name="categoria" defaultValue={padrao} className="py-2 text-xs">
            <CategoriasOpcoes categorias={categorias} />
          </Select>
        </div>
        <div className="w-24">
          <Input name="dias_apos_inicio" type="number" min={0} max={365} defaultValue={0} className="py-2 text-xs text-center" title="Dias após o início" />
        </div>
        <BotaoConfirmar disabled={pending}>{pending ? "…" : "Adicionar"}</BotaoConfirmar>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
    </form>
  );
}
