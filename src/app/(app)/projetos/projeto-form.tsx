"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { BotaoCancelar, BotaoConfirmar, Modal } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { STATUS_PROJETO, STATUS_PROJETO_LABEL } from "@/lib/constantes";
import type { Projeto } from "@/lib/types";
import type { FormState } from "./actions";

export type ClienteOpcao = { id: string; nome: string; empresa: string | null };

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: ClienteOpcao[];
  tipos: string[];
  projeto?: Projeto;
  inicial?: { cliente_id?: string; tipo?: string; valor_total?: number };
  onClose: () => void;
};

export function ProjetoFormModal({ action, clientes, tipos, projeto, inicial, onClose }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const tipoAtual = projeto?.tipo ?? inicial?.tipo ?? "";
  const opcoesTipo = tipoAtual && !tipos.includes(tipoAtual) ? [...tipos, tipoAtual] : tipos;

  return (
    <Modal titulo={projeto ? "Editar projeto" : "Novo projeto"} onClose={onClose} largura="lg">
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cliente" htmlFor="cliente_id">
            <Select id="cliente_id" name="cliente_id" required defaultValue={projeto?.cliente_id ?? inicial?.cliente_id ?? ""}>
              <option value="" disabled>
                Selecione…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.empresa ?? c.nome}
                  {c.empresa ? ` · ${c.nome}` : ""}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Nome do projeto" htmlFor="nome">
            <Input id="nome" name="nome" required autoFocus defaultValue={projeto?.nome} placeholder="Ex.: Site institucional" />
          </Campo>
          <Campo label="Tipo de serviço" htmlFor="tipo">
            <Select id="tipo" name="tipo" defaultValue={tipoAtual}>
              <option value="">—</option>
              {opcoesTipo.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-[#968F88]">
              Faltou algum?{" "}
              <Link href="/configuracoes" className="text-brand-400 hover:text-brand-300">
                Gerenciar serviços
              </Link>
            </p>
          </Campo>
          <Campo label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={projeto?.status ?? "briefing"}>
              {STATUS_PROJETO.map((s) => (
                <option key={s} value={s}>
                  {STATUS_PROJETO_LABEL[s]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Valor total (R$)" htmlFor="valor_total">
            <Input id="valor_total" name="valor_total" type="number" step="0.01" min="0" defaultValue={projeto?.valor_total ?? inicial?.valor_total ?? ""} />
          </Campo>
          <Campo label="Link do projeto" htmlFor="link_projeto" hint="Staging, repositório, Figma…">
            <Input id="link_projeto" name="link_projeto" type="url" placeholder="https://" defaultValue={projeto?.link_projeto ?? ""} />
          </Campo>
          <Campo label="Data de início" htmlFor="data_inicio">
            <Input id="data_inicio" name="data_inicio" type="date" defaultValue={projeto?.data_inicio ?? ""} />
          </Campo>
          <Campo label="Prazo de entrega" htmlFor="prazo_entrega">
            <Input id="prazo_entrega" name="prazo_entrega" type="date" defaultValue={projeto?.prazo_entrega ?? ""} />
          </Campo>
        </div>
        <Campo label="Observações" htmlFor="observacoes" hint="Anotações gerais. O briefing estruturado fica na aba Briefing.">
          <Textarea id="observacoes" name="observacoes" rows={3} defaultValue={projeto?.observacoes ?? ""} />
        </Campo>
        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : projeto ? "Salvar" : "Criar projeto"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}
