"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Campo, Card, Input, MensagemErro, Vazio } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { fmtData } from "@/lib/format";
import type { Contrato } from "@/lib/types";
import { atualizarLinkContrato, excluirContrato, marcarAssinado, marcarEnviado, voltarParaRascunho, type FormState } from "../actions";

const ETAPAS: Array<{ id: Contrato["status"]; label: string }> = [
  { id: "rascunho", label: "Rascunho" },
  { id: "enviado", label: "Enviado" },
  { id: "assinado", label: "Assinado" },
];

export function Contratos({ contratos, criar }: { contratos: Contrato[]; criar: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {contratos.length === 0 ? <Vazio icone="📝" titulo="Nenhum contrato ainda" sub="Crie o primeiro ao lado. O documento fica no Autentique, Docs ou onde preferir." /> : contratos.map((c) => <CartaoContrato key={c.id} c={c} />)}
      </div>
      <NovoContrato criar={criar} />
    </div>
  );
}

function CartaoContrato({ c }: { c: Contrato }) {
  const [pending, startTransition] = useTransition();
  const idx = ETAPAS.findIndex((e) => e.id === c.status);
  const run = (fn: () => Promise<void>) => startTransition(fn);

  return (
    <Card className={cn("space-y-4", pending && "opacity-50")}>
      <ol className="flex items-center gap-2">
        {ETAPAS.map((e, i) => (
          <li key={e.id} className="flex items-center gap-2">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border",
                i < idx && "bg-brand-400/10 border-brand-400/20 text-brand-300",
                i === idx && (e.id === "assinado" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-brand-400/15 border-brand-400/30 text-brand-400"),
                i > idx && "bg-transparent border-[#311C45] text-[#5A496A]",
              )}
            >
              {e.label}
            </span>
            {i < ETAPAS.length - 1 && <span className={cn("h-px w-6", i < idx ? "bg-brand-400" : "bg-[#311C45]")} />}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {[
          ["Criado em", fmtData(c.criado_em)],
          ["Enviado em", fmtData(c.data_envio)],
          ["Assinado em", fmtData(c.data_assinatura)],
        ].map(([k, v], i) => (
          <div key={k} className="bg-[#1B0F26] rounded-lg p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-[#968F88]">{k}</p>
            <p className={cn("font-mono mt-0.5", i === 2 && c.data_assinatura ? "text-emerald-400" : "text-[#DDDBD9]")}>{v}</p>
          </div>
        ))}
      </div>

      <form action={(fd) => run(() => atualizarLinkContrato(c.id, c.projeto_id, fd))} className="flex items-end gap-2">
        <div className="flex-1">
          <Campo label="Link do documento" htmlFor={`link-${c.id}`}>
            <Input id={`link-${c.id}`} name="link_documento" type="url" placeholder="https://" defaultValue={c.link_documento ?? ""} className="py-2 text-xs" />
          </Campo>
        </div>
        <button type="submit" className="px-3 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9] rounded-lg transition-colors">
          Salvar
        </button>
        {c.link_documento && (
          <a href={c.link_documento} target="_blank" rel="noreferrer" className="px-3 py-2 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors">
            Abrir ↗
          </a>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#311C45] pt-4">
        {c.status === "rascunho" && (
          <button type="button" onClick={() => run(() => marcarEnviado(c.id, c.projeto_id))} className="px-3 py-2 bg-brand-400 hover:bg-brand-300 text-white text-xs font-semibold rounded-lg transition-colors">
            Marcar como enviado
          </button>
        )}
        {c.status !== "assinado" && (
          <button
            type="button"
            onClick={() => run(() => marcarAssinado(c.id, c.projeto_id))}
            className={cn(
              "px-3 py-2 text-xs font-semibold rounded-lg transition-colors",
              c.status === "enviado" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10",
            )}
          >
            Marcar como assinado
          </button>
        )}
        {c.status !== "rascunho" && (
          <button type="button" onClick={() => run(() => voltarParaRascunho(c.id, c.projeto_id))} className="px-3 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
            Voltar pra rascunho
          </button>
        )}
        <button type="button" onClick={() => confirm("Excluir este contrato?") && run(() => excluirContrato(c.id, c.projeto_id))} className="ml-auto text-[11px] text-[#968F88] hover:text-red-400 transition-colors">
          Excluir
        </button>
      </div>
    </Card>
  );
}

function NovoContrato({ criar }: { criar: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(criar, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <Card>
      <p className="text-sm font-semibold text-[#F5F5F4] mb-1">Novo contrato</p>
      <p className="text-xs text-[#968F88] mb-4">Cria em rascunho. Depois marque enviado e assinado; as datas entram sozinhas.</p>
      <form ref={ref} action={formAction} className="space-y-3">
        <Campo label="Link do documento" htmlFor="link_documento" hint="Autentique, Google Docs, PDF no Drive… Pode preencher depois.">
          <Input id="link_documento" name="link_documento" type="url" placeholder="https://" />
        </Campo>
        <MensagemErro>{state.erro}</MensagemErro>
        <BotaoConfirmar disabled={pending}>{pending ? "Criando…" : "Criar contrato"}</BotaoConfirmar>
      </form>
    </Card>
  );
}
