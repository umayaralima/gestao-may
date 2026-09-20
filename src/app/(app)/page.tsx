import Link from "next/link";
import { Avatar, BotaoLinha, BotaoPrimario, Busca, Header, KpiCard, Td, Th, Tr } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { CANAL_INTERACAO_LABEL, ETAPA_LEAD_COR, ETAPA_LEAD_LABEL, ETAPAS_PIPELINE, type EtapaLead } from "@/lib/constantes";
import { fmt, fmtK, fmtRelativo, fmtData, hojeISO, mesAnoExtenso, mesCurto, primeiroEUltimoDiaDoMes, somarDias } from "@/lib/format";
import { getConfiguracoes } from "@/lib/configuracoes";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Interacao, Lead } from "@/lib/types";
import { AtividadeSemanal, PipelineDonut, ReceitaMensal, type DiaAtividade, type PontoReceita } from "./graficos";
import { BadgeStatusCliente } from "./clientes/badge-cliente";

type Pago = { valor: number; data_pagamento: string };
type ProjetoResumo = { id: string; cliente_id: string; status: string; valor_total: number | null };
type InteracaoComDono = Interacao & { leads: { nome: string } | null; clientes: { nome: string } | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const hoje = hojeISO();
  const agora = new Date();
  const mesAtual = primeiroEUltimoDiaDoMes();
  const mesAnterior = primeiroEUltimoDiaDoMes(new Date(agora.getFullYear(), agora.getMonth() - 1, 1));
  const inicio12m = primeiroEUltimoDiaDoMes(new Date(agora.getFullYear(), agora.getMonth() - 11, 1)).inicio;

  const [pagos, clientes, leads, projetos, interacoes, followups, tarefasHoje, config] = await Promise.all([
    supabase.from("pagamentos").select("valor, data_pagamento").not("data_pagamento", "is", null).gte("data_pagamento", inicio12m).returns<Pago[]>(),
    supabase.from("clientes").select("*").order("criado_em", { ascending: false }).returns<Cliente[]>(),
    supabase.from("leads").select("*").returns<Lead[]>(),
    supabase.from("projetos").select("id, cliente_id, status, valor_total").returns<ProjetoResumo[]>(),
    supabase
      .from("interacoes")
      .select("*, leads(nome), clientes(nome)")
      .gte("data", somarDias(hoje, -6))
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .returns<InteracaoComDono[]>(),
    supabase.from("leads").select("id", { count: "exact", head: true }).lte("proximo_followup", hoje).in("etapa", ["novo", "em_contato", "proposta_enviada", "negociando"]),
    supabase.from("tarefas").select("id", { count: "exact", head: true }).lte("vencimento", hoje).is("concluida_em", null),
    getConfiguracoes(),
  ]);

  const listaPagos = pagos.data ?? [];
  const listaClientes = clientes.data ?? [];
  const listaLeads = leads.data ?? [];
  const listaProjetos = projetos.data ?? [];
  const listaInteracoes = interacoes.data ?? [];

  // ---- KPIs ----
  const soma = (rows: Pago[]) => rows.reduce((s, r) => s + Number(r.valor), 0);
  const receitaMes = soma(listaPagos.filter((p) => p.data_pagamento >= mesAtual.inicio && p.data_pagamento <= mesAtual.fim));
  const receitaMesAnterior = soma(listaPagos.filter((p) => p.data_pagamento >= mesAnterior.inicio && p.data_pagamento <= mesAnterior.fim));
  const variacaoReceita = receitaMesAnterior > 0 ? ((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100 : null;

  const clientesAtivos = listaClientes.filter((c) => c.status === "ativo").length;
  const novosNoMes = listaClientes.filter((c) => c.criado_em.slice(0, 10) >= mesAtual.inicio).length;

  const fechados = listaLeads.filter((l) => l.etapa === "ganho" || l.etapa === "perdido");
  const ganhos = listaLeads.filter((l) => l.etapa === "ganho").length;
  const taxaConversao = fechados.length ? (ganhos / fechados.length) * 100 : null;

  const comValor = listaProjetos.filter((p) => p.status !== "cancelado" && p.valor_total !== null);
  const ticketMedio = comValor.length ? comValor.reduce((s, p) => s + Number(p.valor_total), 0) / comValor.length : 0;

  // ---- Receita mensal (12 meses) ----
  const receita: PontoReceita[] = [];
  for (let i = 11; i >= 0; i--) {
    const { inicio, fim } = primeiroEUltimoDiaDoMes(new Date(agora.getFullYear(), agora.getMonth() - i, 1));
    receita.push({ mes: mesCurto(inicio), valor: soma(listaPagos.filter((p) => p.data_pagamento >= inicio && p.data_pagamento <= fim)) });
  }

  // ---- Pipeline ----
  const pipeline = ETAPAS_PIPELINE.map((e: EtapaLead) => ({
    name: ETAPA_LEAD_LABEL[e],
    value: listaLeads.filter((l) => l.etapa === e).length,
    color: ETAPA_LEAD_COR[e],
  }));

  // ---- Atividade semanal ----
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const atividade: DiaAtividade[] = [];
  for (let i = 6; i >= 0; i--) {
    const iso = somarDias(hoje, -i);
    const doDia = listaInteracoes.filter((x) => x.data === iso);
    atividade.push({
      dia: DIAS[new Date(`${iso}T00:00:00`).getDay()],
      mensagens: doDia.filter((x) => ["whatsapp", "email", "instagram"].includes(x.canal ?? "")).length,
      conversas: doDia.filter((x) => ["ligacao", "reuniao"].includes(x.canal ?? "")).length,
    });
  }

  // ---- Clientes recentes (valor = soma dos projetos, negócios = nº projetos) ----
  const recentes = listaClientes.slice(0, 6).map((c) => {
    const ps = listaProjetos.filter((p) => p.cliente_id === c.id && p.status !== "cancelado");
    return { ...c, valor: ps.reduce((s, p) => s + Number(p.valor_total ?? 0), 0), negocios: ps.length };
  });

  const pendencias = (followups.count ?? 0) + (tarefasHoje.count ?? 0);
  const iconeCanal: Record<string, string> = { whatsapp: "💬", email: "✉️", instagram: "📸", ligacao: "📞", reuniao: "📅", outro: "📝" };

  return (
    <>
      <Header titulo="Dashboard" sub={`${mesAnoExtenso()} · Atualizado agora`}>
        <Busca placeholder="Buscar clientes…" className="sm:w-52" />
        <Link
          href="/tarefas"
          title={pendencias ? `${pendencias} pendência(s) pra hoje` : "Nada pendente"}
          className="w-8 h-8 rounded-lg bg-[#231431] border border-[#311C45] flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:border-[#5A496A] transition-colors relative"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5a4 4 0 0 0-4 4v2L1.5 9.5h11L11 7.5v-2a4 4 0 0 0-4-4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M5.5 9.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {pendencias > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-400 rounded-full" />}
        </Link>
        <BotaoPrimario href="/clientes?novo=1">Novo cliente</BotaoPrimario>
      </Header>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
          <KpiCard
            label="Receita do mês"
            value={fmtK(receitaMes)}
            sub={`${mesCurto(mesAtual.inicio)} ${mesAtual.inicio.slice(0, 4)}`}
            trend={variacaoReceita === null ? "sem base no mês anterior" : `${Math.abs(variacaoReceita).toFixed(1).replace(".", ",")}% vs. mês anterior`}
            trendUp={variacaoReceita === null ? true : variacaoReceita >= 0}
            href="/financeiro"
            meta={config.meta_mensal ? { valor: config.meta_mensal, atual: receitaMes } : undefined}
          />
          <KpiCard
            label="Clientes ativos"
            value={String(clientesAtivos)}
            sub={`de ${listaClientes.length} cadastrados`}
            trend={`${novosNoMes} novo(s) este mês`}
            trendUp
            href="/clientes"
          />
          <KpiCard
            label="Taxa de conversão"
            value={taxaConversao === null ? "—" : `${taxaConversao.toFixed(1).replace(".", ",")}%`}
            sub="leads → clientes"
            trend={`${ganhos} de ${fechados.length} fechados`}
            trendUp={taxaConversao === null ? true : taxaConversao >= 50}
            href="/pipeline"
          />
          <KpiCard label="Ticket médio" value={fmtK(ticketMedio)} sub="por projeto" trend={`${comValor.length} projeto(s) com valor`} trendUp href="/projetos" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrar entrar-1">
          <ReceitaMensal dados={receita} />
          <PipelineDonut dados={pipeline} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrar entrar-2">
          <AtividadeSemanal dados={atividade} />
          <div className="bg-[#231431] border border-[#311C45] rounded-xl p-5 flex flex-col">
            <p className="text-sm font-semibold text-[#F5F5F4] mb-4">Atividade recente</p>
            <div className="space-y-3 flex-1">
              {listaInteracoes.length === 0 && <p className="text-xs text-[#968F88]">Nenhuma interação nos últimos 7 dias.</p>}
              {listaInteracoes.slice(0, 5).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#311C45] flex items-center justify-center text-sm shrink-0">{iconeCanal[a.canal ?? "outro"] ?? "📝"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#DDDBD9] leading-snug line-clamp-2">
                      {a.resumo}
                      <span className="text-[#968F88]"> — {a.leads?.nome ?? a.clientes?.nome}</span>
                    </p>
                    <p className="text-[10px] text-[#968F88] mt-0.5 font-mono">
                      {fmtRelativo(a.criado_em)}
                      {a.canal && ` · ${CANAL_INTERACAO_LABEL[a.canal as keyof typeof CANAL_INTERACAO_LABEL] ?? a.canal}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/pipeline" className="mt-4 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors text-left">
              Ver todo o histórico →
            </Link>
          </div>
        </div>

        <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden entrar entrar-3">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#311C45]">
            <div>
              <p className="text-sm font-semibold text-[#F5F5F4]">Clientes recentes</p>
              <p className="text-xs text-[#968F88]">{recentes.length} registros</p>
            </div>
            <Link href="/clientes" className="px-3 py-1.5 text-xs text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
              Ver todos
            </Link>
          </div>
          {recentes.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-[#968F88]">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[#311C45]">
                  <Th>Cliente</Th>
                  <Th>Nicho</Th>
                  <Th>Status</Th>
                  <Th>Valor</Th>
                  <Th>Projetos</Th>
                  <Th>Desde</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {recentes.map((c, i) => (
                  <Tr key={c.id} className={cn(i === recentes.length - 1 && "border-b-0")}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar nome={c.empresa ?? c.nome} tamanho={7} />
                        <div>
                          <p className="text-xs font-medium text-[#DDDBD9]">{c.empresa ?? c.nome}</p>
                          {c.empresa && <p className="text-[10px] text-[#968F88]">{c.nome}</p>}
                        </div>
                      </div>
                    </Td>
                    <Td>{c.nicho ?? "—"}</Td>
                    <Td>
                      <BadgeStatusCliente status={c.status} />
                    </Td>
                    <Td className="font-mono text-[#DDDBD9]">{fmt(c.valor)}</Td>
                    <Td className="font-mono text-[#968F88]">{c.negocios}</Td>
                    <Td className="font-mono text-[#968F88]">{fmtData(c.criado_em)}</Td>
                    <Td>
                      <BotaoLinha href={`/clientes/${c.id}`}>Ver</BotaoLinha>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
