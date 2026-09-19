"use client";

import { useActionState, useEffect, useRef } from "react";
import { Botao } from "@/components/ui/botao";
import { Input } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { criarTipoProjeto, type FormState } from "./actions";

export function NovoTipoForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(criarTipoProjeto, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <div className="flex gap-2">
        <Input name="nome" placeholder="Novo serviço, ex.: Identidade visual" required maxLength={80} />
        <Botao type="submit" disabled={pending}>
          {pending ? "…" : "Adicionar"}
        </Botao>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
    </form>
  );
}
