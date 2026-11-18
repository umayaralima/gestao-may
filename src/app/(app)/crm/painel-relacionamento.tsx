"use client";

import { useActionState, useEffect, useRef } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Campo, Card, CardTitulo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { CANAIS_INTERACAO, CANAL_INTERACAO_LABEL } from "@/lib/constantes";
import { fmtData, hojeISO, rotuloDia } from "@/lib/format";
import type { Interacao } from "@/lib/types";
import type { Dono, FormState } from "./actions";

type Props = {
  dono: Dono;
  followup: { data: string | null; nota: string | null };
  interacoes: Interacao[];
  acoes: {
    registrarInteracao: (prev: FormState, fd: FormData) => Promise<FormState>;
    excluirInteracao: (id: string) => Promise<void>;
    salvarFollowup: (prev: FormState, fd: FormData) => Promise<FormState>;
    concluirFollowup: () => Promise<void>;
    adiarFollowup: (dias: number) => Promise<void>;
  };
};

const ICONE: Record<string, string> = { whatsapp: "💬", email: "✉️", instagram: "📸", ligacao: "📞", reuniao: "📅", outro: "📝" };

/** Follow-up + histórico de interações. Mesmo painel pra lead e pra cliente. */
export function PainelRelacionamento({ followup, interacoes, acoes }: Props) {
  const hoje = hojeISO();
  const atrasado = !!followup.data && followup.data < hoje;
  const ehHoje = followup.data === hoje;

  return (
    <div className="space-y-4">
      <Card className={cn(atrasado && "border-red-500/40", ehHoje && "border-amber-500/40")}>
        <div className="flex items-center justify-between mb-3">
          <CardTitulo>Próximo follow-up</CardTitulo>
          {atrasado && <span className="px-2 py-0.5 rounded border bg-red-500/10 border-red-500/20 text-[10px] font-medium text-falha-cor">Atrasado</span>}
          {ehHoje && <span className="px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-[10px] font-medium text-alerta-cor">Hoje</span>}
        </div>

        {followup.data ? (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className={cn("text-lg font-mono font-semibold", atrasado ? "text-falha-cor" : ehHoje ? "text-alerta-cor" : "text-texto")}>
                {rotuloDia(followup.data)} <span className="text-xs font-normal text-texto-mudo">· {fmtData(followup.data)}</span>
              </p>
              {followup.nota && <p className="mt-0.5 text-xs text-texto-sutil">{followup.nota}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <form action={acoes.concluirFollowup}>
                <button type="submit" className="px-2.5 py-1 text-[11px] text-sucesso-cor border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors">
                  Feito
                </button>
              </form>
              <form action={() => acoes.adiarFollowup(1)}>
                <button type="submit" className="px-2.5 py-1 text-[11px] text-texto-mudo border border-borda hover:border-borda-forte rounded-lg transition-colors">
                  +1 dia
                </button>
              </form>
              <form action={() => acoes.adiarFollowup(7)}>
                <button type="submit" className="px-2.5 py-1 text-[11px] text-texto-mudo border border-borda hover:border-borda-forte rounded-lg transition-colors">
                  +1 sem
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-xs text-texto-mudo">Nenhum follow-up agendado.</p>
        )}

        <FollowupForm action={acoes.salvarFollowup} atual={followup} />
      </Card>

      <Card>
        <CardTitulo>Interações</CardTitulo>
        <div className="mt-3">
          <InteracaoForm action={acoes.registrarInteracao} />
        </div>

        {interacoes.length === 0 ? (
          <p className="mt-4 text-xs text-texto-mudo">Nenhuma interação registrada.</p>
        ) : (
          <div className="relative mt-5">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-superficie-2" />
            <div className="space-y-4 pl-8">
              {interacoes.map((i) => (
                <div key={i.id} className="relative group">
                  <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-superficie-2 border border-borda-forte flex items-center justify-center text-[10px]">
                    {ICONE[i.canal ?? "outro"] ?? "📝"}
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-medium text-texto-suave">{i.canal ? CANAL_INTERACAO_LABEL[i.canal as keyof typeof CANAL_INTERACAO_LABEL] ?? i.canal : "Interação"}</p>
                    <form action={() => acoes.excluirInteracao(i.id)}>
                      <button type="submit" className="opacity-0 group-hover:opacity-100 text-[10px] text-texto-mudo hover:text-falha-cor transition-all">
                        excluir
                      </button>
                    </form>
                  </div>
                  <p className="text-[10px] font-mono text-texto-mudo mt-0.5">{fmtData(i.data)}</p>
                  <p className="text-[11px] text-texto-sutil mt-1 leading-relaxed whitespace-pre-wrap">{i.resumo}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function FollowupForm({ action, atual }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; atual: { data: string | null; nota: string | null } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-3 border-t border-borda pt-4">
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <Campo label={atual.data ? "Reagendar" : "Agendar"} htmlFor="proximo_followup">
          <Input id="proximo_followup" name="proximo_followup" type="date" defaultValue={atual.data ?? ""} className="py-2 text-xs" />
        </Campo>
        <Campo label="Lembrete" htmlFor="nota_followup">
          <Input id="nota_followup" name="nota_followup" placeholder="Ex.: cobrar resposta da proposta" defaultValue={atual.nota ?? ""} className="py-2 text-xs" />
        </Campo>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 text-xs text-texto-mudo border border-borda hover:border-borda-forte hover:text-texto-suave rounded-lg transition-colors disabled:opacity-40"
      >
        {pending ? "Salvando…" : "Salvar follow-up"}
      </button>
    </form>
  );
}

function InteracaoForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[140px_140px_1fr]">
        <Campo label="Data" htmlFor="data">
          <Input id="data" name="data" type="date" defaultValue={hojeISO()} required className="py-2 text-xs" />
        </Campo>
        <Campo label="Canal" htmlFor="canal">
          <Select id="canal" name="canal" defaultValue="whatsapp" className="py-2 text-xs">
            {CANAIS_INTERACAO.map((c) => (
              <option key={c} value={c}>
                {CANAL_INTERACAO_LABEL[c]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="O que rolou" htmlFor="resumo">
          <Textarea id="resumo" name="resumo" rows={1} placeholder="Resumo da conversa" required className="py-2 text-xs min-h-[38px]" />
        </Campo>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
      <BotaoConfirmar disabled={pending}>{pending ? "Registrando…" : "Registrar interação"}</BotaoConfirmar>
    </form>
  );
}
