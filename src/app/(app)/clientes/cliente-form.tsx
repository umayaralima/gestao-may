"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select, Textarea } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { ORIGENS_CLIENTE, ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import type { Cliente } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  cliente?: Cliente;
  cancelarHref: string;
};

export function ClienteForm({ action, cliente, cancelarHref }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5 rounded-medium bg-branco p-6 shadow-padrao">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Nome *" htmlFor="nome">
          <Input id="nome" name="nome" required defaultValue={cliente?.nome} autoFocus />
        </Campo>
        <Campo label="Empresa" htmlFor="empresa">
          <Input id="empresa" name="empresa" defaultValue={cliente?.empresa ?? ""} />
        </Campo>
        <Campo label="Nicho" htmlFor="nicho" hint="Ex.: clínica, advocacia, moda">
          <Input id="nicho" name="nicho" defaultValue={cliente?.nicho ?? ""} />
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
        <Campo label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
        </Campo>
        <Campo label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" inputMode="tel" placeholder="(00) 00000-0000" defaultValue={cliente?.whatsapp ?? ""} />
        </Campo>
        <Campo label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={cliente?.status ?? "ativo"}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </Select>
        </Campo>
      </div>

      <Campo label="Observações" htmlFor="observacoes">
        <Textarea id="observacoes" name="observacoes" defaultValue={cliente?.observacoes ?? ""} />
      </Campo>

      <MensagemErro>{state.erro}</MensagemErro>

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pending}>
          {pending ? "Salvando…" : cliente ? "Salvar alterações" : "Cadastrar cliente"}
        </Botao>
        <Botao href={cancelarHref} variante="terciario">
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
