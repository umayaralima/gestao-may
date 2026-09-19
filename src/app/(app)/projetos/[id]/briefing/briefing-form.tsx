"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Textarea } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import type { Briefing } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  briefing: Briefing | null;
};

export function BriefingForm({ action, briefing }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5 rounded-[12px] bg-superficie p-6 border border-borda">
      <Campo label="Objetivo do projeto" htmlFor="objetivo" hint="O que o cliente quer alcançar com isso?">
        <Textarea id="objetivo" name="objetivo" defaultValue={briefing?.objetivo ?? ""} />
      </Campo>

      <Campo label="Público-alvo" htmlFor="publico_alvo">
        <Textarea id="publico_alvo" name="publico_alvo" className="min-h-20" defaultValue={briefing?.publico_alvo ?? ""} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Referências visuais" htmlFor="referencias" hint="Links de sites, Pinterest, Behance…">
          <Textarea id="referencias" name="referencias" className="min-h-20" defaultValue={briefing?.referencias ?? ""} />
        </Campo>
        <Campo label="Concorrentes" htmlFor="concorrentes">
          <Textarea id="concorrentes" name="concorrentes" className="min-h-20" defaultValue={briefing?.concorrentes ?? ""} />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-[12px] border-2 border-borda p-4 text-sm has-checked:border-rosa-600 has-checked:bg-rosa-900/40">
          <input type="checkbox" name="tem_identidade_visual" defaultChecked={briefing?.tem_identidade_visual ?? false} className="mt-0.5 accent-rosa-600" />
          <span>
            <span className="block font-medium text-texto-suave">Já tem identidade visual</span>
            <span className="text-xs text-texto-mudo">Logo, paleta, tipografia definidas</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-[12px] border-2 border-borda p-4 text-sm has-checked:border-rosa-600 has-checked:bg-rosa-900/40">
          <input type="checkbox" name="conteudo_disponivel" defaultChecked={briefing?.conteudo_disponivel ?? false} className="mt-0.5 accent-rosa-600" />
          <span>
            <span className="block font-medium text-texto-suave">Conteúdo pronto</span>
            <span className="text-xs text-texto-mudo">Textos e imagens já disponíveis</span>
          </span>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Cores preferidas" htmlFor="cores_preferidas">
          <Input id="cores_preferidas" name="cores_preferidas" defaultValue={briefing?.cores_preferidas ?? ""} />
        </Campo>
        <Campo label="Orçamento aproximado (R$)" htmlFor="orcamento_aproximado">
          <Input id="orcamento_aproximado" name="orcamento_aproximado" type="number" step="0.01" min="0" defaultValue={briefing?.orcamento_aproximado ?? ""} />
        </Campo>
      </div>

      <Campo label="Funcionalidades" htmlFor="funcionalidades" hint="Blog, loja, formulário, área de membros, agendamento…">
        <Textarea id="funcionalidades" name="funcionalidades" className="min-h-20" defaultValue={briefing?.funcionalidades ?? ""} />
      </Campo>

      <MensagemErro>{state.erro}</MensagemErro>

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar briefing"}
        </Botao>
        {state.ok && <span className="text-sm text-[#5fe07a]">Briefing salvo.</span>}
      </div>
    </form>
  );
}
