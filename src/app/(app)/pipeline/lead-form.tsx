"use client";

import { useActionState, useEffect, useState } from "react";
import { BotaoCancelar, BotaoConfirmar, Escolha, Modal } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import {
  ETAPA_LEAD_LABEL,
  ETAPAS_PIPELINE,
  ORIGENS_CLIENTE,
  ORIGEM_CLIENTE_LABEL,
  PRIORIDADE_COR,
  PRIORIDADE_LABEL,
  PRIORIDADES,
  type EtapaLead,
  type Prioridade,
} from "@/lib/constantes";
import type { Lead } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  tipos: string[];
  lead?: Lead;
  etapaInicial?: EtapaLead;
  onClose: () => void;
};

/** Modal "Novo negócio" / editar, no padrão do NewTaskModal do protótipo. */
export function LeadFormModal({ action, tipos, lead, etapaInicial = "novo", onClose }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [prioridade, setPrioridade] = useState<Prioridade>(lead?.prioridade ?? "media");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const opcoesTipo = lead?.servico_interesse && !tipos.includes(lead.servico_interesse) ? [...tipos, lead.servico_interesse] : tipos;

  return (
    <Modal titulo={lead ? "Editar negócio" : "Novo negócio"} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="prioridade" value={prioridade} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Contato" htmlFor="nome">
            <Input id="nome" name="nome" required autoFocus defaultValue={lead?.nome} placeholder="Quem entrou em contato" />
          </Campo>
          <Campo label="Empresa" htmlFor="empresa">
            <Input id="empresa" name="empresa" defaultValue={lead?.empresa ?? ""} />
          </Campo>
          <Campo label="WhatsApp" htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" inputMode="tel" placeholder="(00) 00000-0000" defaultValue={lead?.whatsapp ?? ""} />
          </Campo>
          <Campo label="Instagram" htmlFor="instagram">
            <Input id="instagram" name="instagram" placeholder="@perfil" defaultValue={lead?.instagram ? `@${lead.instagram}` : ""} />
          </Campo>
          <Campo label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} />
          </Campo>
          <Campo label="Origem" htmlFor="origem">
            <Select id="origem" name="origem" defaultValue={lead?.origem ?? ""}>
              <option value="">—</option>
              {ORIGENS_CLIENTE.map((o) => (
                <option key={o} value={o}>
                  {ORIGEM_CLIENTE_LABEL[o]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Serviço de interesse" htmlFor="servico_interesse">
            <Select id="servico_interesse" name="servico_interesse" defaultValue={lead?.servico_interesse ?? ""}>
              <option value="">—</option>
              {opcoesTipo.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Valor estimado (R$)" htmlFor="valor_estimado">
            <Input id="valor_estimado" name="valor_estimado" type="number" step="0.01" min="0" defaultValue={lead?.valor_estimado ?? ""} />
          </Campo>
          <Campo label="Etapa" htmlFor="etapa">
            <Select id="etapa" name="etapa" defaultValue={lead?.etapa ?? etapaInicial}>
              {ETAPAS_PIPELINE.map((e) => (
                <option key={e} value={e}>
                  {ETAPA_LEAD_LABEL[e]}
                </option>
              ))}
              {lead?.etapa === "perdido" && <option value="perdido">Perdido</option>}
            </Select>
          </Campo>
          <Campo label="Próxima ação (data)" htmlFor="proximo_followup">
            <Input id="proximo_followup" name="proximo_followup" type="date" defaultValue={lead?.proximo_followup ?? ""} />
          </Campo>
        </div>
        <Campo label="Próxima ação" htmlFor="nota_followup">
          <Input id="nota_followup" name="nota_followup" placeholder="Ex.: enviar proposta, ligar, mandar portfólio" defaultValue={lead?.nota_followup ?? ""} />
        </Campo>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] block mb-2">Prioridade</p>
          <Escolha
            opcoes={PRIORIDADES.map((p) => ({ valor: p, label: PRIORIDADE_LABEL[p], dot: PRIORIDADE_COR[p] }))}
            valor={prioridade}
            onChange={setPrioridade}
          />
        </div>
        <Campo label="Observações" htmlFor="observacoes">
          <Textarea id="observacoes" name="observacoes" rows={2} placeholder="Contexto do primeiro contato, o que a pessoa quer…" defaultValue={lead?.observacoes ?? ""} />
        </Campo>
        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : lead ? "Salvar" : "Criar negócio"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}
