import Link from "next/link";
import { notFound } from "next/navigation";
import { Botao } from "@/components/ui/botao";
import { Card, CardTitulo } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginaHeader } from "@/components/ui/pagina";
import { SelectInline } from "@/components/ui/select-inline";
import { ETAPAS_LEAD, ETAPA_LEAD_LABEL, ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Interacao, Lead } from "@/lib/types";
import {
  adiarFollowup,
  concluirFollowup,
  excluirInteracao,
  registrarInteracao,
  salvarFollowup,
  type Dono,
} from "../../crm/actions";
import { PainelRelacionamento } from "../../crm/painel-relacionamento";
import { converterEmCliente, excluirLead, mudarEtapaLead, salvarMotivoPerda } from "../actions";
import { BadgeEtapa } from "../badge-etapa";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead }, { data: interacoes }, { data: clienteConvertido }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single<Lead>(),
    supabase.from("interacoes").select("*").eq("lead_id", id).order("data", { ascending: false }).order("criado_em", { ascending: false }).returns<Interacao[]>(),
    supabase.from("clientes").select("id, nome").eq("lead_id", id).maybeSingle<{ id: string; nome: string }>(),
  ]);
  if (!lead) notFound();

  const dono: Dono = { tipo: "lead", id: lead.id };
  const mudarEtapa = mudarEtapaLead.bind(null, lead.id);
  const motivoPerda = salvarMotivoPerda.bind(null, lead.id);
  const converter = converterEmCliente.bind(null, lead.id);
  const excluir = excluirLead.bind(null, lead.id);

  const acoes = {
    registrarInteracao: registrarInteracao.bind(null, dono),
    excluirInteracao: excluirInteracao.bind(null, dono),
    salvarFollowup: salvarFollowup.bind(null, dono),
    concluirFollowup: concluirFollowup.bind(null, dono),
    adiarFollowup: adiarFollowup.bind(null, dono),
  };

  const contatos: Array<[string, React.ReactNode]> = [
    ["WhatsApp", lead.whatsapp ? <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-rosa-300 hover:underline">{lead.whatsapp}</a> : null],
    ["Instagram", lead.instagram ? <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noreferrer" className="text-rosa-300 hover:underline">@{lead.instagram}</a> : null],
    ["E-mail", lead.email ? <a href={`mailto:${lead.email}`} className="text-rosa-300 hover:underline">{lead.email}</a> : null],
    ["Origem", lead.origem ? ORIGEM_CLIENTE_LABEL[lead.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? lead.origem : null],
    ["Serviço de interesse", lead.servico_interesse],
    ["Valor estimado", lead.valor_estimado !== null ? formatBRL(lead.valor_estimado) : null],
    ["Cadastrado em", formatDate(lead.criado_em)],
  ];

  return (
    <>
      <PaginaHeader
        titulo={lead.nome}
        descricao={lead.empresa ?? undefined}
        acao={
          <div className="flex flex-wrap items-center gap-3">
            <SelectInline
              name="etapa"
              label="Etapa"
              value={lead.etapa}
              opcoes={ETAPAS_LEAD.map((e) => ({ valor: e, label: ETAPA_LEAD_LABEL[e] }))}
              action={mudarEtapa}
            />
            <Botao href={`/leads/${lead.id}/editar`} variante="secundario">
              Editar
            </Botao>
          </div>
        }
      />

      {clienteConvertido ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[12px] bg-sucesso/10 px-5 py-3">
          <p className="text-sm text-texto-suave">
            Lead convertido. Cliente:{" "}
            <Link href={`/clientes/${clienteConvertido.id}`} className="font-medium text-rosa-300 underline">
              {clienteConvertido.nome}
            </Link>
          </p>
          <Botao href={`/projetos/novo?cliente=${clienteConvertido.id}`} variante="secundario">
            Novo projeto pra esse cliente
          </Botao>
        </div>
      ) : (
        lead.etapa !== "perdido" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-rosa-600 bg-rosa-900/40 px-5 py-3">
            <p className="text-sm text-rosa-100">
              {lead.etapa === "ganho" ? "Lead ganho! Falta criar o cadastro de cliente." : "Fechou? Converta em cliente e já abra o projeto."}
            </p>
            <form action={converter}>
              <Botao type="submit">Converter em cliente</Botao>
            </form>
          </div>
        )
      )}

      {lead.etapa === "perdido" && (
        <form action={motivoPerda} className="mb-6 flex flex-wrap items-end gap-2 rounded-[12px] bg-superficie-2 px-5 py-3">
          <div className="min-w-64 flex-1">
            <label htmlFor="motivo_perda" className="mb-1.5 block rotulo">
              Motivo da perda
            </label>
            <Input id="motivo_perda" name="motivo_perda" placeholder="Preço, prazo, fechou com outro, sumiu…" defaultValue={lead.motivo_perda ?? ""} />
          </div>
          <Botao type="submit" variante="secundario">
            Salvar motivo
          </Botao>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CardTitulo>Contato</CardTitulo>
              <BadgeEtapa etapa={lead.etapa} />
            </div>
            <dl className="space-y-3 text-sm">
              {contatos.map(([k, v]) => (
                <div key={k}>
                  <dt className="rotulo">{k}</dt>
                  <dd className="text-texto-suave">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {lead.observacoes && (
              <div className="mt-4 border-t border-borda/60 pt-3">
                <p className="rotulo">Observações</p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-texto-suave">{lead.observacoes}</p>
              </div>
            )}
          </Card>

          <form action={excluir}>
            <Botao type="submit" variante="perigo" className="w-full">
              Excluir lead
            </Botao>
            <p className="mt-2 text-xs text-texto-mudo">Apaga o histórico de interações. O cliente convertido, se houver, fica.</p>
          </form>
        </div>

        <PainelRelacionamento
          dono={dono}
          followup={{ data: lead.proximo_followup, nota: lead.nota_followup }}
          interacoes={interacoes ?? []}
          acoes={acoes}
        />
      </div>
    </>
  );
}
