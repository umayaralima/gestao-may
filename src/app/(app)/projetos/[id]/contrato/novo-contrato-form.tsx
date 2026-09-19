"use client";

import { useActionState, useEffect, useRef } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import type { FormState } from "./actions";

export function NovoContratoForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4 rounded-[12px] border-2 border-dashed border-borda p-4">
      <p className="text-sm font-medium text-texto-suave">Novo contrato</p>
      <Campo label="Link do documento" htmlFor="link_documento" hint="Autentique, Google Docs, PDF no Drive… Pode deixar vazio e preencher depois.">
        <Input id="link_documento" name="link_documento" type="url" placeholder="https://" />
      </Campo>
      <MensagemErro>{state.erro}</MensagemErro>
      <Botao type="submit" variante="secundario" disabled={pending}>
        {pending ? "Criando…" : "Criar contrato (rascunho)"}
      </Botao>
    </form>
  );
}
