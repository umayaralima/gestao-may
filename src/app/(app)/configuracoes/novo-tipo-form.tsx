"use client";

import { useActionState, useEffect, useRef } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Input, MensagemErro } from "@/components/ui/primitivos";
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
        <Input name="nome" placeholder="Novo serviço, ex.: Identidade visual" required maxLength={80} className="py-2 text-xs" />
        <BotaoConfirmar disabled={pending}>{pending ? "…" : "Adicionar"}</BotaoConfirmar>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
    </form>
  );
}
