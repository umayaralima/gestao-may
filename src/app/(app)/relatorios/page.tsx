import { getConfiguracoes } from "@/lib/configuracoes";
import { CANAL_INTERACAO_LABEL, ETAPA_LEAD_LABEL, ORIGEM_CLIENTE_LABEL, STATUS_PROJETO_LABEL, type EtapaLead } from "@/lib/constantes";
import { diffDias, hojeISO, mesCurto, somarDias } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Interacao, Lead, Projeto } from "@/lib/types";
import { Relatorios } from "./relatorios";
import { PERIODOS, VISOES, type DadosRelatorio, type Periodo, type Visao } from "./tipos";

type PagResumo = { projeto_id: string; valor: number; vencimento: string; data_pagamento: string | null; status: "pago" | "pendente" | "atrasado" };
type TarefaResumo = { projeto_id: string | null; vencimento: string | null; concluida_em: string | null; ordem: number | null; criado_em: string };

/*
 * Relatórios (Reports.tsx do Make, adaptado pra uma pessoa): Visão geral, Receita, Funil e Produção
 * (no lugar de "Equipe"). Tudo calculado aqui no server a partir de pagamentos, projetos, leads,
 * interações e etapas; o período (?periodo=) recorta por data.
 */
export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ ver?: string; periodo?: string }> }) {
  const { ver, periodo: periodoParam } = await searchParams;
  const visao: Visao = VISOES.some((v) => v.id === ver) ? (ver as Visao) : "geral";
  const periodo: Periodo = PERIODOS.some((p) => p.id === periodoParam) ? (periodoParam as Periodo) : "6m";
  const meses = { "3m": 3, "6m": 6, "12m": 12, tudo: 120 }[periodo];

  const hoje = hojeISO();
  const [ano, mes] = hoje.split("-").map(Number);
  // Início do período = primeiro dia de (mês atual − (meses − 1))
  const inicioDate = new Date(ano, mes - 1 - (meses - 1), 1);
  const inicio = `${inicioDate.getFullYear()}-${String(inicioDate.getMonth() + 1).padStart(2, "0")}-01`;
  const inicioAnteriorDate = new Date(inicioDate.getFullYear(), inicioDate.getMonth() - meses, 1);
  const inicioAnterior = `${inicioAnteriorDate.getFullYear()}-${String(inicioAnteriorDate.getMonth() + 1).padStart(2, "0")}-01`;
  const fimAnterior = somarDias(inicio, -1);

  const supabase = await createClient();
  const [{ data: pagamentos }, { data: projetos }, { data: leads }, { data: clientes }, { data: interacoes }, { data: tarefas }, config] = await Promise.all([
    supabase.from("pagamentos_view").select("projeto_id, valor, vencimento, data_pagamento, status").returns<PagResumo[]>(),
    supabase.from("projetos").select("*").returns<Projeto[]>(),
    supabase.from("leads").select("*").returns<Lead[]>(),
    supabase.from("clientes").select("*").returns<Cliente[]>(),
    supabase.from("interacoes").select("*").gte("data", inicioAnterior).returns<Interacao[]>(),
    supabase.from("tarefas").select("projeto_id, vencimento, concluida_em, ordem, criado_em").not("projeto_id", "is", null).returns<TarefaResumo[]>(),
    getConfiguracoes(),
  ]);

  const pags = pagamentos ?? [];
  const projs = projetos ?? [];
  const lds = leads ?? [];
  const clis = clientes ?? [];
  const its = interacoes ?? [];
  const tfs = tarefas ?? [];
  const nomeCliente = (id: string) => {
    const c = clis.find((x) => x.id === id);
    return c ? (c.empresa ?? c.nome) : "—";
  };
  const projetoDe = (id: string) => projs.find((p) => p.id === id);
  const noPeriodo = (d: string | null | undefined) => !!d && d >= inicio && d <= hoje;
  const noAnterior = (d: string | null | undefined) => !!d && d >= inicioAnterior && d <= fimAnterior;
  const soma = (xs: Array<{ valor: number }>) => xs.reduce((s, x) => s + Number(x.valor), 0);
  const variacao = (atual: number, anterior: number) => (anterior > 0 ? ((atual - anterior) / anterior) * 100 : null);

  /* ---------- Receita ---------- */
  const pagos = pags.filter((p) => p.status === "pago");
  const pagosPeriodo = pagos.filter((p) => noPeriodo(p.data_pagamento));
  const pagosAnterior = pagos.filter((p) => noAnterior(p.data_pagamento));
  const receita = soma(pagosPeriodo);
  const receitaAnterior = soma(pagosAnterior);
  const meta = config.meta_mensal ? Number(config.meta_mensal) : null;

  // Série mensal (meses do período; "tudo" = desde o primeiro pagamento)
  const primeiroPago = pagos.map((p) => p.data_pagamento!).sort()[0];
  const inicioSerie = periodo === "tudo" && primeiroPago ? `${primeiroPago.slice(0, 7)}-01` : inicio;
  const serie: DadosRelatorio["receitaMensal"] = [];
  for (let d = new Date(`${inicioSerie}T12:00:00`); d <= new Date(`${hoje}T12:00:00`); d.setMonth(d.getMonth() + 1)) {
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const doMes = pagos.filter((p) => p.data_pagamento!.startsWith(chave));
    const pendentesMes = pags.filter((p) => p.status !== "pago" && p.vencimento.startsWith(chave));
    serie.push({ mes: `${mesCurto(`${chave}-01`)}${d.getMonth() === 0 || serie.length === 0 ? `/${String(d.getFullYear()).slice(2)}` : ""}`, receita: soma(doMes), meta: meta ?? 0, previsto: soma(pendentesMes) });
  }
  const mesesSerie = serie.length;
  const metaAcumulada = meta ? meta * mesesSerie : null;
  const melhorMes = [...serie].sort((a, b) => b.receita - a.receita)[0] ?? null;
  const aReceber = soma(pags.filter((p) => p.status !== "pago"));
  const vencido = soma(pags.filter((p) => p.status === "atrasado"));

  // Por tipo de serviço e por cliente (receita recebida no período)
  const porChave = (fn: (p: PagResumo) => string) => {
    const m = new Map<string, number>();
    for (const p of pagosPeriodo) m.set(fn(p), (m.get(fn(p)) ?? 0) + Number(p.valor));
    return [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  };
  const receitaPorTipo = porChave((p) => projetoDe(p.projeto_id)?.tipo ?? "Sem tipo");
  const receitaPorCliente = porChave((p) => {
    const pr = projetoDe(p.projeto_id);
    return pr ? nomeCliente(pr.cliente_id) : "—";
  }).slice(0, 5);
  const receitaClienteAnterior = new Map<string, number>();
  for (const p of pagosAnterior) {
    const pr = projetoDe(p.projeto_id);
    const k = pr ? nomeCliente(pr.cliente_id) : "—";
    receitaClienteAnterior.set(k, (receitaClienteAnterior.get(k) ?? 0) + Number(p.valor));
  }

  /* ---------- Projetos / ticket ---------- */
  const fechadosPeriodo = projs.filter((p) => !["briefing", "orcamento_enviado", "cancelado"].includes(p.status) && noPeriodo(p.criado_em.slice(0, 10)));
  const fechadosAnterior = projs.filter((p) => !["briefing", "orcamento_enviado", "cancelado"].includes(p.status) && noAnterior(p.criado_em.slice(0, 10)));
  const comValor = fechadosPeriodo.filter((p) => p.valor_total !== null);
  const ticketMedio = comValor.length ? comValor.reduce((s, p) => s + Number(p.valor_total), 0) / comValor.length : 0;
  const comValorAnt = fechadosAnterior.filter((p) => p.valor_total !== null);
  const ticketAnterior = comValorAnt.length ? comValorAnt.reduce((s, p) => s + Number(p.valor_total), 0) / comValorAnt.length : 0;

  /* ---------- Funil ---------- */
  const leadsPeriodo = lds.filter((l) => noPeriodo(l.criado_em.slice(0, 10)));
  const leadsAnterior = lds.filter((l) => noAnterior(l.criado_em.slice(0, 10)));
  const ordem: EtapaLead[] = ["novo", "em_contato", "proposta_enviada", "negociando", "ganho"];
  const posicao = (l: Lead) => (l.etapa === "perdido" ? -1 : ordem.indexOf(l.etapa));
  // Quantos leads do período passaram por cada etapa (um lead em "negociando" passou por novo, em_contato e proposta)
  const funil = ordem.map((e, i) => {
    const n = leadsPeriodo.filter((l) => (l.etapa === "perdido" ? i === 0 : posicao(l) >= i)).length;
    return { etapa: ETAPA_LEAD_LABEL[e], valor: n, pct: leadsPeriodo.length ? Math.round((n / leadsPeriodo.length) * 100) : 0 };
  });
  const ganhos = leadsPeriodo.filter((l) => l.etapa === "ganho");
  const perdidos = leadsPeriodo.filter((l) => l.etapa === "perdido");
  const fechados = ganhos.length + perdidos.length;
  const taxaConversao = fechados ? (ganhos.length / fechados) * 100 : null;
  const fechadosAnt = leadsAnterior.filter((l) => l.etapa === "ganho" || l.etapa === "perdido");
  const taxaAnterior = fechadosAnt.length ? (leadsAnterior.filter((l) => l.etapa === "ganho").length / fechadosAnt.length) * 100 : null;
  const ciclos = ganhos.map((l) => diffDias(l.criado_em.slice(0, 10), l.atualizado_em.slice(0, 10))).filter((d) => d >= 0);
  const cicloMedio = ciclos.length ? Math.round(ciclos.reduce((s, d) => s + d, 0) / ciclos.length) : null;
  const contar = (xs: Array<string | null>, label: (k: string) => string) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x ?? "outro", (m.get(x ?? "outro") ?? 0) + 1);
    return [...m.entries()].map(([k, valor]) => ({ nome: label(k), valor })).sort((a, b) => b.valor - a.valor);
  };
  const leadsPorOrigem = contar(
    leadsPeriodo.map((l) => l.origem),
    (k) => ORIGEM_CLIENTE_LABEL[k as keyof typeof ORIGEM_CLIENTE_LABEL] ?? k,
  );
  const motivosPerda = contar(
    perdidos.map((l) => l.motivo_perda?.trim() || null),
    (k) => (k === "outro" ? "Sem motivo informado" : k),
  ).slice(0, 5);

  /* ---------- Atividade (interações) ---------- */
  const itsPeriodo = its.filter((i) => noPeriodo(i.data));
  const itsAnterior = its.filter((i) => noAnterior(i.data));
  const atividadePorCanal = contar(
    itsPeriodo.map((i) => i.canal),
    (k) => CANAL_INTERACAO_LABEL[k as keyof typeof CANAL_INTERACAO_LABEL] ?? k,
  );
  // Últimas 8 semanas, por semana
  const atividadeSemanal: DadosRelatorio["atividadeSemanal"] = [];
  for (let s = 7; s >= 0; s--) {
    const fimSemana = somarDias(hoje, -7 * s);
    const iniSemana = somarDias(fimSemana, -6);
    const doIntervalo = its.filter((i) => i.data >= iniSemana && i.data <= fimSemana);
    atividadeSemanal.push({ semana: fimSemana.slice(8, 10) + "/" + fimSemana.slice(5, 7), interacoes: doIntervalo.length });
  }

  // Clientes sem contato (substitui "Risco de churn"): ativos com projeto em andamento/entregue, por dias sem interação
  const ultimaInteracao = new Map<string, string>();
  for (const i of its) if (i.cliente_id && (!ultimaInteracao.has(i.cliente_id) || i.data > ultimaInteracao.get(i.cliente_id)!)) ultimaInteracao.set(i.cliente_id, i.data);
  const semContato = clis
    .filter((c) => c.status === "ativo" && projs.some((p) => p.cliente_id === c.id && !["concluido", "cancelado"].includes(p.status)))
    .map((c) => {
      const ultima = ultimaInteracao.get(c.id) ?? null;
      return { id: c.id, nome: c.empresa ?? c.nome, ultima, dias: ultima ? diffDias(ultima, hoje) : null };
    })
    .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999))
    .slice(0, 5);

  /* ---------- Produção ---------- */
  const entreguesPeriodo = projs.filter((p) => ["entregue", "concluido"].includes(p.status));
  const duracoes = entreguesPeriodo
    .filter((p) => p.data_inicio && p.prazo_entrega)
    .map((p) => {
      const etapasDoProjeto = tfs.filter((t) => t.projeto_id === p.id && t.concluida_em);
      const ultimaEtapa = etapasDoProjeto.map((t) => t.concluida_em!.slice(0, 10)).sort().at(-1);
      const fim = ultimaEtapa ?? p.prazo_entrega!;
      return { p, dias: diffDias(p.data_inicio!, fim), noPrazo: fim <= p.prazo_entrega! };
    });
  const prazoMedio = duracoes.length ? Math.round(duracoes.reduce((s, d) => s + d.dias, 0) / duracoes.length) : null;
  const noPrazoPct = duracoes.length ? Math.round((duracoes.filter((d) => d.noPrazo).length / duracoes.length) * 100) : null;
  const etapasAbertas = tfs.filter((t) => !t.concluida_em);
  const etapasAtrasadas = etapasAbertas.filter((t) => t.vencimento && t.vencimento < hoje).length;
  const porStatus = (["briefing", "orcamento_enviado", "aprovado", "em_desenvolvimento", "em_revisao", "entregue", "concluido"] as const).map((s) => ({
    nome: STATUS_PROJETO_LABEL[s],
    valor: projs.filter((p) => p.status === s).length,
  }));
  const tempoPorTipo = [...new Set(duracoes.map((d) => d.p.tipo ?? "Sem tipo"))].map((tipo) => {
    const ds = duracoes.filter((d) => (d.p.tipo ?? "Sem tipo") === tipo);
    return { nome: tipo, valor: Math.round(ds.reduce((s, d) => s + d.dias, 0) / ds.length), n: ds.length };
  });
  const emProducao = projs
    .filter((p) => ["aprovado", "em_desenvolvimento", "em_revisao"].includes(p.status))
    .map((p) => {
      const ts = tfs.filter((t) => t.projeto_id === p.id);
      const feitas = ts.filter((t) => t.concluida_em).length;
      return {
        id: p.id,
        nome: p.nome,
        cliente: nomeCliente(p.cliente_id),
        status: STATUS_PROJETO_LABEL[p.status],
        total: ts.length,
        feitas,
        atrasadas: ts.filter((t) => !t.concluida_em && t.vencimento && t.vencimento < hoje).length,
        prazo: p.prazo_entrega,
        diasPrazo: p.prazo_entrega ? diffDias(hoje, p.prazo_entrega) : null,
      };
    })
    .sort((a, b) => b.atrasadas - a.atrasadas || (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));

  const dados: DadosRelatorio = {
    periodoLabel: `${mesCurto(inicioSerie)} ${inicioSerie.slice(0, 4)} — ${mesCurto(hoje)} ${hoje.slice(0, 4)}`,
    receita,
    variacaoReceita: variacao(receita, receitaAnterior),
    meta,
    metaAcumulada,
    metaPct: metaAcumulada ? Math.round((receita / metaAcumulada) * 100) : null,
    receitaMensal: serie,
    mediaMensal: mesesSerie ? receita / mesesSerie : 0,
    melhorMes: melhorMes && melhorMes.receita > 0 ? { mes: melhorMes.mes, valor: melhorMes.receita } : null,
    aReceber,
    vencido,
    receitaPorTipo,
    receitaPorCliente: receitaPorCliente.map((c) => ({ ...c, variacao: variacao(c.valor, receitaClienteAnterior.get(c.nome) ?? 0) })),
    projetosFechados: fechadosPeriodo.length,
    variacaoFechados: variacao(fechadosPeriodo.length, fechadosAnterior.length),
    ticketMedio,
    variacaoTicket: variacao(ticketMedio, ticketAnterior),
    totalLeads: leadsPeriodo.length,
    variacaoLeads: variacao(leadsPeriodo.length, leadsAnterior.length),
    taxaConversao,
    variacaoConversao: taxaConversao !== null && taxaAnterior !== null ? taxaConversao - taxaAnterior : null,
    cicloMedio,
    perdidos: perdidos.length,
    funil,
    leadsPorOrigem,
    motivosPerda,
    interacoes: itsPeriodo.length,
    variacaoInteracoes: variacao(itsPeriodo.length, itsAnterior.length),
    atividadePorCanal,
    atividadeSemanal,
    semContato,
    entregues: entreguesPeriodo.length,
    prazoMedio,
    noPrazoPct,
    etapasAbertas: etapasAbertas.length,
    etapasAtrasadas,
    projetosPorStatus: porStatus,
    tempoPorTipo,
    emProducao,
  };

  return <Relatorios visao={visao} periodo={periodo} dados={dados} />;
}
