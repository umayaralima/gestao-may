"use client";

import { useActionState, useEffect, useRef } from "react";
import { Botao } from "@/components/ui/botao";
import { Card, CardTitulo } from "@/components/ui/card";
import { Campo, Input, Select, Textarea } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { cn } from "@/lib/cn";
import { CANAIS_INTERACAO, CANAL_INTERACAO_LABEL } from "@/lib/constantes";
import { formatDate, hojeISO } from "@/lib/format";
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

/** Follow-up + histórico de interações. Mesmo painel pra lead e pra cliente. */
export function PainelRelacionamento({ followup, interacoes, acoes }: Props) {
  const hoje = hojeISO();
  const atrasado = !!followup.data && followup.data < hoje;
  const ehHoje = followup.data === hoje;

  return (
    <div className="space-y-6">
      <Card className={cn(atrasado && "ring-2 ring-falha", ehHoje && "ring-2 ring-alerta")}>
        <div className="flex items-center justify-between">
          <CardTitulo>Próximo follow-up</CardTitulo>
          {atrasado && <span className="rounded-smaller bg-falha px-2 py-0.5 text-xs font-semibold uppercase text-white">Atrasado</span>}
          {ehHoje && <span className="rounded-smaller bg-alerta px-2 py-0.5 text-xs font-semibold uppercase text-white">Hoje</span>}
        </div>

        {followup.data ? (
          <div className="mb-4">
            <p className={cn("text-2xl", atrasado ? "text-falha" : "text-neutro-900")}>{formatDate(followup.data)}</p>
            {followup.nota && <p className="mt-1 text-sm text-neutro-700">{followup.nota}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <form action={acoes.concluirFollowup}>
                <button type="submit" className="font-medium text-sucesso underline underline-offset-4">
                  Feito
                </button>
              </form>
              <form action={() => acoes.adiarFollowup(1)}>
                <button type="submit" className="text-neutro-500 underline underline-offset-4 hover:text-neutro-800">
                  Adiar 1 dia
                </button>
              </form>
              <form action={() => acoes.adiarFollowup(7)}>
                <button type="submit" className="text-neutro-500 underline underline-offset-4 hover:text-neutro-800">
                  Adiar 1 semana
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-sm text-neutro-500">Nenhum follow-up agendado.</p>
        )}

        <FollowupForm action={acoes.salvarFollowup} atual={followup} />
      </Card>

      <Card>
        <CardTitulo>Interações</CardTitulo>
        <InteracaoForm action={acoes.registrarInteracao} />

        {interacoes.length === 0 ? (
          <p className="mt-4 text-sm text-neutro-500">Nenhuma interação registrada.</p>
        ) : (
          <ol className="mt-5 space-y-4 border-l-2 border-neutro-100 pl-4">
            {interacoes.map((i) => (
              <li key={i.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-rosa-600" />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs uppercase tracking-wide text-neutro-500">
                    {formatDate(i.data)}
                    {i.canal && <> · {CANAL_INTERACAO_LABEL[i.canal as keyof typeof CANAL_INTERACAO_LABEL] ?? i.canal}</>}
                  </p>
                  <form action={() => acoes.excluirInteracao(i.id)}>
                    <button type="submit" className="text-[11px] text-neutro-400 underline underline-offset-4 hover:text-falha">
                      excluir
                    </button>
                  </form>
                </div>
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-neutro-800">{i.resumo}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function FollowupForm({
  action,
  atual,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  atual: { data: string | null; nota: string | null };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-3 border-t border-neutro-0 pt-4">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <Campo label={atual.data ? "Reagendar" : "Agendar"} htmlFor="proximo_followup">
          <Input id="proximo_followup" name="proximo_followup" type="date" defaultValue={atual.data ?? ""} />
        </Campo>
        <Campo label="Lembrete" htmlFor="nota_followup">
          <Input id="nota_followup" name="nota_followup" placeholder="Ex.: cobrar resposta da proposta" defaultValue={atual.nota ?? ""} />
        </Campo>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
      <Botao type="submit" variante="secundario" disabled={pending}>
        {pending ? "Salvando…" : "Salvar follow-up"}
      </Botao>
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
      <div className="grid gap-3 sm:grid-cols-[150px_150px_1fr]">
        <Campo label="Data" htmlFor="data">
          <Input id="data" name="data" type="date" defaultValue={hojeISO()} required />
        </Campo>
        <Campo label="Canal" htmlFor="canal">
          <Select id="canal" name="canal" defaultValue="whatsapp">
            {CANAIS_INTERACAO.map((c) => (
              <option key={c} value={c}>
                {CANAL_INTERACAO_LABEL[c]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="O que rolou" htmlFor="resumo">
          <Textarea id="resumo" name="resumo" className="min-h-[42px]" placeholder="Resumo da conversa" required />
        </Campo>
      </div>
      <MensagemErro>{state.erro}</MensagemErro>
      <Botao type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar interação"}
      </Botao>
    </form>
  );
}
