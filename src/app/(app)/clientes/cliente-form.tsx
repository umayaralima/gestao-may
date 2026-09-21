"use client";

import { useActionState, useEffect } from "react";
import { BotaoCancelar, BotaoConfirmar, Modal } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { CONTATO_PREFERIDO_LABEL, CONTATOS_PREFERIDOS, ORIGENS_CLIENTE, ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import type { Cliente } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  cliente?: Cliente;
  onClose: () => void;
};

/**
 * Modal de cliente (novo / editar), no padrão do NewTaskModal do protótipo.
 * Três blocos: contato, dados pra contrato (documento/endereço), acessos e observações.
 */
export function ClienteFormModal({ action, cliente, onClose }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal titulo={cliente ? "Editar cliente" : "Novo cliente"} onClose={onClose} largura="lg">
      <form id="form-cliente" action={formAction} className="space-y-5">
        <Bloco titulo="Contato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nome" htmlFor="nome">
              <Input id="nome" name="nome" required autoFocus defaultValue={cliente?.nome} placeholder="Nome da pessoa de contato" />
            </Campo>
            <Campo label="Empresa" htmlFor="empresa">
              <Input id="empresa" name="empresa" defaultValue={cliente?.empresa ?? ""} />
            </Campo>
            <Campo label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" inputMode="tel" placeholder="(00) 00000-0000" defaultValue={cliente?.whatsapp ?? ""} />
            </Campo>
            <Campo label="E-mail" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
            </Campo>
            <Campo label="Instagram" htmlFor="instagram">
              <Input id="instagram" name="instagram" placeholder="@perfil" defaultValue={cliente?.instagram ? `@${cliente.instagram}` : ""} />
            </Campo>
            <Campo label="Site atual" htmlFor="site">
              <Input id="site" name="site" placeholder="empresa.com.br" defaultValue={cliente?.site ?? ""} />
            </Campo>
            <Campo label="Contato preferido" htmlFor="contato_preferido">
              <Select id="contato_preferido" name="contato_preferido" defaultValue={cliente?.contato_preferido ?? ""}>
                <option value="">—</option>
                {CONTATOS_PREFERIDOS.map((c) => (
                  <option key={c} value={c}>
                    {CONTATO_PREFERIDO_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Nicho" htmlFor="nicho">
              <Input id="nicho" name="nicho" placeholder="Ex.: clínica, moda" defaultValue={cliente?.nicho ?? ""} />
            </Campo>
          </div>
        </Bloco>

        <Bloco titulo="Dados pra contrato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="CPF / CNPJ" htmlFor="documento">
              <Input id="documento" name="documento" placeholder="000.000.000-00" defaultValue={cliente?.documento ?? ""} />
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
          </div>
          <Campo label="Endereço" htmlFor="endereco">
            <Input id="endereco" name="endereco" placeholder="Rua, número, bairro, cidade — UF, CEP" defaultValue={cliente?.endereco ?? ""} />
          </Campo>
        </Bloco>

        <Bloco titulo="Acessos e observações">
          <Campo label="Acessos e links" htmlFor="acessos" hint="Hospedagem, domínio, pasta no Drive, painel do site… Evite colar senhas aqui.">
            <Textarea id="acessos" name="acessos" rows={2} defaultValue={cliente?.acessos ?? ""} />
          </Campo>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <Campo label="Observações" htmlFor="observacoes">
              <Textarea id="observacoes" name="observacoes" rows={2} defaultValue={cliente?.observacoes ?? ""} />
            </Campo>
            <Campo label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={cliente?.status ?? "ativo"}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </Select>
            </Campo>
          </div>
        </Bloco>

        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : cliente ? "Salvar" : "Criar cliente"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400">{titulo}</p>
      {children}
    </div>
  );
}
