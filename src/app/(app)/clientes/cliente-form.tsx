"use client";

import { useActionState, useEffect } from "react";
import { BotaoCancelar, BotaoConfirmar, Modal } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { ORIGENS_CLIENTE, ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import type { Cliente } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  cliente?: Cliente;
  onClose: () => void;
};

/** Modal de cliente (novo / editar), no padrão do NewTaskModal do protótipo. */
export function ClienteFormModal({ action, cliente, onClose }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal titulo={cliente ? "Editar cliente" : "Novo cliente"} onClose={onClose}>
      <form id="form-cliente" action={formAction} className="space-y-4">
        <Campo label="Nome" htmlFor="nome">
          <Input id="nome" name="nome" required autoFocus defaultValue={cliente?.nome} placeholder="Nome da pessoa de contato" />
        </Campo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Empresa" htmlFor="empresa">
            <Input id="empresa" name="empresa" defaultValue={cliente?.empresa ?? ""} />
          </Campo>
          <Campo label="Nicho" htmlFor="nicho">
            <Input id="nicho" name="nicho" placeholder="Ex.: clínica, moda" defaultValue={cliente?.nicho ?? ""} />
          </Campo>
          <Campo label="WhatsApp" htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" inputMode="tel" placeholder="(00) 00000-0000" defaultValue={cliente?.whatsapp ?? ""} />
          </Campo>
          <Campo label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
          </Campo>
          <Campo label="Origem" htmlFor="origem">
            <Select id="origem" name="origem" defaultValue={cliente?.origem ?? ""}>
              <option value="">—</option>
              {ORIGENS_CLIENTE.map((o) => (
                <option key={o} value={o}>
                  {ORIGEM_CLIENTE_LABEL[o]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={cliente?.status ?? "ativo"}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </Campo>
        </div>
        <Campo label="Observações" htmlFor="observacoes">
          <Textarea id="observacoes" name="observacoes" rows={2} defaultValue={cliente?.observacoes ?? ""} />
        </Campo>
        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : cliente ? "Salvar" : "Criar cliente"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}
