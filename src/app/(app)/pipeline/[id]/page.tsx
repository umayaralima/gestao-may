import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectInline } from "@/components/ui/select-inline";
import { Avatar, BotaoPrimario, Card, Header, Input, KpiCard, Pill } from "@/components/ui/primitivos";
import { ETAPA_LEAD_LABEL, ETAPAS_LEAD, ORIGEM_CLIENTE_LABEL, PRIORIDADE_LABEL } from "@/lib/constantes";
import { diffDias, fmt, fmtData, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Interacao, Lead } from "@/lib/types";
import { adiarFollowup, concluirFollowup, excluirInteracao, registrarInteracao, salvarFollowup, type Dono } from "../../crm/actions";
import { PainelRelacionamento } from "../../crm/painel-relacionamento";
import { converterEmCliente, excluirLead, mudarEtapaLead, salvarMotivoPerda } from "../actions";
import { EditarLeadBotao } from "./editar-botao";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead }, { data: interacoes }, { data: clienteConvertido }, { data: tipos }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single<Lead>(),
    supabase.from("interacoes").select("*").eq("lead_id", id).order("data", { ascending: false }).order("criado_em", { ascending: false }).returns<Interacao[]>(),
    supabase.from("clientes").select("id, nome, empresa").eq("lead_id", id).maybeSingle<{ id: string; nome: string; empresa: string | null }>(),
    supabase.from("tipos_projeto").select("nome").order("ordem").order("nome"),
  ]);
  if (!lead) notFound();

  const dono: Dono = { tipo: "lead", id: lead.id };
  const acoes = {
    registrarInteracao: registrarInteracao.bind(null, dono),
    excluirInteracao: excluirInteracao.bind(null, dono),
    salvarFollowup: salvarFollowup.bind(null, dono),
    concluirFollowup: concluirFollowup.bind(null, dono),
    adiarFollowup: adiarFollowup.bind(null, dono),
  };
  const mudarEtapa = mudarEtapaLead.bind(null, lead.id);
  const motivoPerda = salvarMotivoPerda.bind(null, lead.id);
  const converter = converterEmCliente.bind(null, lead.id);
  const excluir = excluirLead.bind(null, lead.id);
  const diasNaEtapa = diffDias(lead.atualizado_em.slice(0, 10), hojeISO());

  return (
    <>
      <Header
        titulo={lead.empresa ?? lead.nome}
        sub={
          <>
            <Link href="/pipeline" className="hover:text-[#DDDBD9]">
              Pipeline
            </Link>{" "}
            › {ETAPA_LEAD_LABEL[lead.etapa]} · {lead.empresa ? lead.nome : lead.servico_interesse ?? "negócio"}
          </>
        }
      >
        <SelectInline name="etapa" label="Etapa" value={lead.etapa} opcoes={ETAPAS_LEAD.map((e) => ({ valor: e, label: ETAPA_LEAD_LABEL[e] }))} action={mudarEtapa} />
        <EditarLeadBotao lead={lead} tipos={(tipos ?? []).map((t) => t.nome)} />
        {!clienteConvertido && lead.etapa !== "perdido" && (
          <form action={converter}>
            <BotaoPrimario type="submit" icone={false}>
              Converter em cliente
            </BotaoPrimario>
          </form>
        )}
      </Header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {clienteConvertido && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 entrar">
            <p className="text-xs text-[#DDDBD9]">
              Negócio fechado. Cliente:{" "}
              <Link href={`/clientes/${clienteConvertido.id}`} className="font-medium text-emerald-400 hover:underline">
                {clienteConvertido.empresa ?? clienteConvertido.nome}
              </Link>
            </p>
            <Link href={`/projetos?novo=1&cliente=${clienteConvertido.id}`} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              Novo projeto →
            </Link>
          </div>
        )}

        {lead.etapa === "perdido" && (
          <form action={motivoPerda} className="flex items-end gap-2 rounded-xl border border-[#311C45] bg-[#231431] px-5 py-4 entrar">
            <div className="flex-1">
              <label htmlFor="motivo_perda" className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] block mb-1.5">
                Motivo da perda
              </label>
              <Input id="motivo_perda" name="motivo_perda" placeholder="Preço, prazo, fechou com outro, sumiu…" defaultValue={lead.motivo_perda ?? ""} />
            </div>
            <button type="submit" className="px-3 py-2.5 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9] rounded-lg transition-colors">
              Salvar
            </button>
          </form>
        )}

        <div className="grid grid-cols-4 gap-4 entrar">
          <KpiCard label="Valor estimado" value={lead.valor_estimado !== null ? fmt(lead.valor_estimado) : "—"} sub={lead.servico_interesse ?? "serviço não definido"} />
          <KpiCard label="Etapa" value={ETAPA_LEAD_LABEL[lead.etapa]} sub={`há ${diasNaEtapa} dia(s) nesta etapa`} accent={diasNaEtapa > 10 ? "text-amber-400" : undefined} />
          <KpiCard label="Prioridade" value={PRIORIDADE_LABEL[lead.prioridade]} accent={lead.prioridade === "alta" ? "text-red-400" : lead.prioridade === "media" ? "text-amber-400" : "text-[#968F88]"} sub={`cadastrado ${fmtData(lead.criado_em)}`} />
          <KpiCard label="Interações" value={String((interacoes ?? []).length)} sub={interacoes?.[0] ? `última ${fmtData(interacoes[0].data)}` : "nenhuma ainda"} />
        </div>

        <div className="grid grid-cols-3 gap-4 entrar entrar-1">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar nome={lead.empresa ?? lead.nome} tamanho={11} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F5F4] truncate">{lead.nome}</p>
                <p className="text-[11px] text-[#968F88] truncate">{lead.empresa ?? "Sem empresa"}</p>
              </div>
            </div>
            <dl className="space-y-2.5 text-xs">
              <Linha k="WhatsApp">
                {lead.whatsapp ? (
                  <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300">
                    {lead.whatsapp}
                  </a>
                ) : (
                  "—"
                )}
              </Linha>
              <Linha k="Instagram">
                {lead.instagram ? (
                  <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300">
                    @{lead.instagram}
                  </a>
                ) : (
                  "—"
                )}
              </Linha>
              <Linha k="E-mail">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="font-mono text-brand-400 hover:text-brand-300">
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </Linha>
              <Linha k="Origem">{lead.origem ? ORIGEM_CLIENTE_LABEL[lead.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? lead.origem : "—"}</Linha>
            </dl>
            {lead.observacoes && (
              <div className="border-t border-[#311C45] pt-3">
                <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-1.5">Observações</p>
                <p className="text-[11px] text-[#C5C2BE] leading-relaxed whitespace-pre-wrap">{lead.observacoes}</p>
              </div>
            )}
            {lead.motivo_perda && (
              <div className="border-t border-[#311C45] pt-3">
                <Pill tom="error" dot={false}>
                  Perdido: {lead.motivo_perda}
                </Pill>
              </div>
            )}
            <form action={excluir} className="border-t border-[#311C45] pt-3">
              <button type="submit" className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors">
                Excluir negócio
              </button>
            </form>
          </Card>

          <div className="col-span-2">
            <PainelRelacionamento dono={dono} followup={{ data: lead.proximo_followup, nota: lead.nota_followup }} interacoes={interacoes ?? []} acoes={acoes} />
          </div>
        </div>
      </div>
    </>
  );
}

function Linha({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#968F88]">{k}</dt>
      <dd className="text-[#DDDBD9] truncate">{children}</dd>
    </div>
  );
}
