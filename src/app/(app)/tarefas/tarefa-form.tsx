"use client";

import { useActionState, useEffect, useState } from "react";
import { BotaoCancelar, BotaoConfirmar, Escolha, Modal } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { CATEGORIA_TAREFA_LABEL, CATEGORIAS_TAREFA, PRIORIDADE_COR, PRIORIDADE_LABEL, PRIORIDADES, type Prioridade } from "@/lib/constantes";
import type { Tarefa } from "@/lib/types";
import type { FormState } from "./actions";
import type { Vinculo } from "./tarefas";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  vinculos: Vinculo[];
  tarefa?: Tarefa;
  vinculoInicial?: string;
  dataInicial?: string;
  onClose: () => void;
};

/** NewTaskModal do protótipo. */
export function TarefaFormModal({ action, vinculos, tarefa, vinculoInicial, dataInicial, onClose }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? "media");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const vinculoAtual = tarefa?.cliente_id ? `cliente:${tarefa.cliente_id}` : tarefa?.lead_id ? `lead:${tarefa.lead_id}` : (vinculoInicial ?? "");
  const grupos = ["Clientes", "Pipeline"] as const;

  return (
    <Modal titulo={tarefa ? "Editar tarefa" : "Nova tarefa"} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="prioridade" value={prioridade} />
        <Campo label="Título" htmlFor="titulo">
          <Input id="titulo" name="titulo" autoFocus required placeholder="O que precisa ser feito?" defaultValue={tarefa?.titulo} />
        </Campo>
        <Campo label="Descrição" htmlFor="descricao">
          <Textarea id="descricao" name="descricao" rows={2} placeholder="Detalhes opcionais…" defaultValue={tarefa?.descricao ?? ""} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cliente / negócio" htmlFor="vinculo">
            <Select id="vinculo" name="vinculo" defaultValue={vinculoAtual}>
              <option value="">Nenhum</option>
              {grupos.map((g) => (
                <optgroup key={g} label={g}>
                  {vinculos
                    .filter((v) => v.grupo === g)
                    .map((v) => (
                      <option key={v.valor} value={v.valor}>
                        {v.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Campo>
          <Campo label="Categoria" htmlFor="categoria">
            <Select id="categoria" name="categoria" defaultValue={tarefa?.categoria ?? "ligacao"}>
              {CATEGORIAS_TAREFA.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_TAREFA_LABEL[c]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Prazo" htmlFor="vencimento">
            <Input id="vencimento" name="vencimento" type="date" defaultValue={tarefa?.vencimento ?? dataInicial ?? ""} />
          </Campo>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] block mb-1.5">Prioridade</p>
            <Escolha opcoes={PRIORIDADES.map((p) => ({ valor: p, label: PRIORIDADE_LABEL[p], dot: PRIORIDADE_COR[p] }))} valor={prioridade} onChange={setPrioridade} />
          </div>
        </div>
        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : tarefa ? "Salvar" : "Criar tarefa"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}
