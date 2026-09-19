"use client";

import { useActionState } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Campo, Card, Input, MensagemErro, Textarea } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import type { Briefing } from "@/lib/types";
import type { FormState } from "../actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  briefing: Briefing | null;
};

export function BriefingForm({ action, briefing }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="grid grid-cols-3 gap-4">
      <Card className="col-span-2 space-y-4">
        <Campo label="Objetivo do projeto" htmlFor="objetivo" hint="O que o cliente quer alcançar com isso?">
          <Textarea id="objetivo" name="objetivo" rows={3} defaultValue={briefing?.objetivo ?? ""} />
        </Campo>
        <Campo label="Público-alvo" htmlFor="publico_alvo">
          <Textarea id="publico_alvo" name="publico_alvo" rows={2} defaultValue={briefing?.publico_alvo ?? ""} />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Referências visuais" htmlFor="referencias" hint="Links de sites, Pinterest, Behance…">
            <Textarea id="referencias" name="referencias" rows={3} defaultValue={briefing?.referencias ?? ""} />
          </Campo>
          <Campo label="Concorrentes" htmlFor="concorrentes">
            <Textarea id="concorrentes" name="concorrentes" rows={3} defaultValue={briefing?.concorrentes ?? ""} />
          </Campo>
        </div>
        <Campo label="Funcionalidades" htmlFor="funcionalidades" hint="Blog, loja, formulário, área de membros, agendamento…">
          <Textarea id="funcionalidades" name="funcionalidades" rows={2} defaultValue={briefing?.funcionalidades ?? ""} />
        </Campo>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88]">O cliente já tem</p>
          <Check nome="tem_identidade_visual" titulo="Identidade visual" sub="Logo, paleta, tipografia" marcado={briefing?.tem_identidade_visual ?? false} />
          <Check nome="conteudo_disponivel" titulo="Conteúdo pronto" sub="Textos e imagens" marcado={briefing?.conteudo_disponivel ?? false} />
        </Card>
        <Card className="space-y-4">
          <Campo label="Cores preferidas" htmlFor="cores_preferidas">
            <Input id="cores_preferidas" name="cores_preferidas" defaultValue={briefing?.cores_preferidas ?? ""} />
          </Campo>
          <Campo label="Orçamento aproximado (R$)" htmlFor="orcamento_aproximado">
            <Input id="orcamento_aproximado" name="orcamento_aproximado" type="number" step="0.01" min="0" defaultValue={briefing?.orcamento_aproximado ?? ""} />
          </Campo>
        </Card>
        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center gap-3">
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : "Salvar briefing"}</BotaoConfirmar>
          {state.ok && <span className="text-xs text-emerald-400">Salvo.</span>}
        </div>
      </div>
    </form>
  );
}

function Check({ nome, titulo, sub, marcado }: { nome: string; titulo: string; sub: string; marcado: boolean }) {
  return (
    <label className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors border-[#311C45] hover:border-[#5A496A] has-checked:border-brand-400/40 has-checked:bg-brand-400/5")}>
      <input type="checkbox" name={nome} defaultChecked={marcado} className="mt-0.5 w-3.5 h-3.5 accent-brand-400" />
      <span>
        <span className="block text-xs font-medium text-[#DDDBD9]">{titulo}</span>
        <span className="text-[10px] text-[#968F88]">{sub}</span>
      </span>
    </label>
  );
}
