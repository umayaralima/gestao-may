"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select, Textarea } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { ORIGENS_CLIENTE, ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import type { Lead } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  tipos: string[];
  lead?: Lead;
  cancelarHref: string;
};

export function LeadForm({ action, tipos, lead, cancelarHref }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const opcoesTipo = lead?.servico_interesse && !tipos.includes(lead.servico_interesse) ? [...tipos, lead.servico_interesse] : tipos;

  return (
    <form action={formAction} className="space-y-5 rounded-[12px] bg-superficie p-6 border border-borda">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Nome *" htmlFor="nome">
          <Input id="nome" name="nome" required defaultValue={lead?.nome} autoFocus />
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
        {!lead && (
          <>
            <Campo label="Primeiro follow-up" htmlFor="proximo_followup">
              <Input id="proximo_followup" name="proximo_followup" type="date" />
            </Campo>
            <Campo label="Lembrete" htmlFor="nota_followup">
              <Input id="nota_followup" name="nota_followup" placeholder="Ex.: mandar portfólio" />
            </Campo>
          </>
        )}
      </div>

      {lead && (
        <>
          <input type="hidden" name="proximo_followup" value={lead.proximo_followup ?? ""} />
          <input type="hidden" name="nota_followup" value={lead.nota_followup ?? ""} />
        </>
      )}

      <Campo label="Observações" htmlFor="observacoes" hint="Contexto do primeiro contato, o que a pessoa quer, dores…">
        <Textarea id="observacoes" name="observacoes" defaultValue={lead?.observacoes ?? ""} />
      </Campo>

      <MensagemErro>{state.erro}</MensagemErro>

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pending}>
          {pending ? "Salvando…" : lead ? "Salvar alterações" : "Cadastrar lead"}
        </Botao>
        <Botao href={cancelarHref} variante="terciario">
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
