"use client";

import { useActionState, useEffect, useRef } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { FORMAS_PAGAMENTO, FORMA_PAGAMENTO_LABEL, TIPO_PAGAMENTO, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { criarPagamento, type FormState } from "./actions";

export function PagamentoForm({ projetoId, dataInicio }: { projetoId: string; dataInicio: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(criarPagamento, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-[12px] border-2 border-dashed border-borda p-4">
      <input type="hidden" name="projeto_id" value={projetoId} />
      <p className="text-sm font-medium text-texto-suave">Adicionar parcela</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo label="Tipo" htmlFor="tipo">
          <Select id="tipo" name="tipo" defaultValue="">
            <option value="">—</option>
            {TIPO_PAGAMENTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_PAGAMENTO_LABEL[t]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Valor (R$) *" htmlFor="valor">
          <Input id="valor" name="valor" type="number" step="0.01" min="0.01" required />
        </Campo>
        <Campo label="Vencimento *" htmlFor="vencimento">
          <Input id="vencimento" name="vencimento" type="date" required min={dataInicio ?? undefined} />
        </Campo>
        <Campo label="Forma" htmlFor="forma_pagamento">
          <Select id="forma_pagamento" name="forma_pagamento" defaultValue="">
            <option value="">—</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>
                {FORMA_PAGAMENTO_LABEL[f]}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
      <Botao type="submit" variante="secundario" disabled={pending}>
        {pending ? "Salvando…" : "Adicionar"}
      </Botao>
    </form>
  );
}
