"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input, Select, Textarea } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import Link from "next/link";
import { STATUS_PROJETO, STATUS_PROJETO_LABEL } from "@/lib/constantes";
import type { Projeto } from "@/lib/types";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: Array<{ id: string; nome: string; empresa: string | null }>;
  tipos: string[];
  projeto?: Projeto;
  clienteInicial?: string;
  /** Pré-preenchimento (ex.: vindo da conversão de um lead). */
  inicial?: { tipo?: string; valor_total?: number };
  cancelarHref: string;
};

export function ProjetoForm({ action, clientes, tipos, projeto, clienteInicial, inicial, cancelarHref }: Props) {
  // Projeto antigo com tipo que já foi removido das configurações continua aparecendo no select
  const tipoAtual = projeto?.tipo ?? inicial?.tipo ?? "";
  const opcoesTipo = tipoAtual && !tipos.includes(tipoAtual) ? [...tipos, tipoAtual] : tipos;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5 rounded-[12px] bg-superficie p-6 border border-borda">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Cliente *" htmlFor="cliente_id">
          <Select id="cliente_id" name="cliente_id" required defaultValue={projeto?.cliente_id ?? clienteInicial ?? ""}>
            <option value="" disabled>
              Selecione…
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.empresa ? ` · ${c.empresa}` : ""}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Nome do projeto *" htmlFor="nome">
          <Input id="nome" name="nome" required defaultValue={projeto?.nome} placeholder="Ex.: Site institucional" />
        </Campo>
        <Campo label="Tipo de serviço" htmlFor="tipo">
          <Select id="tipo" name="tipo" defaultValue={tipoAtual}>
            <option value="">—</option>
            {opcoesTipo.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-texto-mudo">
            Faltou algum?{" "}
            <Link href="/configuracoes" className="text-rosa-300 underline">
              Gerenciar serviços
            </Link>
          </p>
        </Campo>
        <Campo label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={projeto?.status ?? "briefing"}>
            {STATUS_PROJETO.map((s) => (
              <option key={s} value={s}>
                {STATUS_PROJETO_LABEL[s]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Valor total (R$)" htmlFor="valor_total">
          <Input id="valor_total" name="valor_total" type="number" step="0.01" min="0" defaultValue={projeto?.valor_total ?? inicial?.valor_total ?? ""} />
        </Campo>
        <Campo label="Link do projeto" htmlFor="link_projeto" hint="Staging, repositório, Figma…">
          <Input id="link_projeto" name="link_projeto" type="url" placeholder="https://" defaultValue={projeto?.link_projeto ?? ""} />
        </Campo>
        <Campo label="Data de início" htmlFor="data_inicio">
          <Input id="data_inicio" name="data_inicio" type="date" defaultValue={projeto?.data_inicio ?? ""} />
        </Campo>
        <Campo label="Prazo de entrega" htmlFor="prazo_entrega">
          <Input id="prazo_entrega" name="prazo_entrega" type="date" defaultValue={projeto?.prazo_entrega ?? ""} />
        </Campo>
      </div>

      <Campo label="Observações" htmlFor="observacoes" hint="Anotações gerais. O briefing estruturado fica na aba Briefing do projeto.">
        <Textarea id="observacoes" name="observacoes" className="min-h-36" defaultValue={projeto?.observacoes ?? ""} />
      </Campo>

      <MensagemErro>{state.erro}</MensagemErro>

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pending}>
          {pending ? "Salvando…" : projeto ? "Salvar alterações" : "Criar projeto"}
        </Botao>
        <Botao href={cancelarHref} variante="terciario">
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
