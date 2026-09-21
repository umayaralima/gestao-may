"use client";

import { useActionState, useEffect, useRef } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Input, MensagemErro, Select } from "@/components/ui/primitivos";
import { GRUPO_CATEGORIA_LABEL, GRUPOS_CATEGORIA } from "@/lib/constantes";
import { criarCategoriaTarefa, type FormState } from "./actions";

export function NovaCategoriaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(criarCategoriaTarefa, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="w-16 shrink-0">
          <Input name="icone" placeholder="🎨" maxLength={8} className="py-2 text-xs text-center" title="Emoji (opcional)" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Input name="nome" placeholder="Nova categoria, ex.: Testes" required maxLength={80} className="py-2 text-xs" />
        </div>
        <div className="w-36">
          <Select name="grupo" defaultValue="producao" className="py-2 text-xs">
          {GRUPOS_CATEGORIA.map((g) => (
            <option key={g} value={g}>
              {GRUPO_CATEGORIA_LABEL[g]}
            </option>
          ))}
          </Select>
        </div>
        <BotaoConfirmar disabled={pending}>{pending ? "…" : "Adicionar"}</BotaoConfirmar>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
    </form>
  );
}
