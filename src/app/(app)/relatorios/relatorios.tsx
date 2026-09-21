"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Header } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { fmt, fmtData, fmtK } from "@/lib/format";
import { PERIODOS, VISOES, type DadosRelatorio, type Periodo, type Serie, type Visao } from "./tipos";

/*
 * Tela Relatórios do protótipo (Reports.tsx do Make). Adaptações pro sistema de uma pessoa:
 * "Equipe" virou "Produção"; "Risco de churn" virou "Clientes sem contato"; "Receita por segmento"
 * virou "Receita por tipo de serviço". Período e visão vivem na URL (?periodo=&ver=).
 */

const CORES = ["#B159C7", "#A151B5", "#D8B3E5", "#7E3F8D", "#CB90D9", "#61316D", "#E7CCEE"];
const pct1 = (v: number) => `${Math.abs(v).toFixed(1).replace(".", ",")}%`;
const tendencia = (v: number | null, sufixo = "vs. período anterior") => (v === null ? { trend: "sem base anterior", trendUp: true } : { trend: `${pct1(v)} ${sufixo}`, trendUp: v >= 0 });

export function Relatorios({ visao, periodo, dados: d }: { visao: Visao; periodo: Periodo; dados: DadosRelatorio }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const setParam = (chave: string, valor: string) => {
    const n = new URLSearchParams(params.toString());
    n.set(chave, valor);
    router.replace(`${pathname}?${n}`);
  };
  const seletorPeriodo = <PeriodSelector value={periodo} onChange={(v) => setParam("periodo", v)} />;

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Relatórios" sub={`${d.periodoLabel} · Dados atualizados agora`}>
        {seletorPeriodo}
        <div className="hidden md:block w-px h-4 bg-[#311C45]" />
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9] rounded-lg transition-colors whitespace-nowrap"
        >
          Exportar PDF
        </button>
      </Header>

      {/* Sub-nav */}
      <div className="flex items-center gap-1 px-4 md:px-6 py-3 border-b border-[#311C45] shrink-0 overflow-x-auto">
        {VISOES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setParam("ver", v.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border",
              visao === v.id ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "text-[#968F88] hover:text-[#DDDBD9] border-transparent",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        {visao === "geral" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
              <KpiCard label="Receita no período" value={fmtK(d.receita)} sub={d.periodoLabel} {...tendencia(d.variacaoReceita)} />
              <KpiCard
                label="Meta atingida"
                value={d.metaPct !== null ? `${d.metaPct}%` : "—"}
                sub={d.metaAcumulada ? `de ${fmt(d.metaAcumulada)} no período` : "defina a meta em Configurações"}
                trend={d.metaPct !== null ? (d.metaPct >= 100 ? "meta batida" : `faltam ${fmt((d.metaAcumulada ?? 0) - d.receita)}`) : "sem meta"}
                trendUp={(d.metaPct ?? 0) >= 100}
              />
              <KpiCard label="Projetos fechados" value={String(d.projetosFechados)} sub="no período" {...tendencia(d.variacaoFechados)} />
              <KpiCard label="Ticket médio" value={fmtK(d.ticketMedio)} sub="por projeto" {...tendencia(d.variacaoTicket)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrar entrar-1">
              <Section title="Receita vs Meta" sub={`Mensal, ${d.periodoLabel}`} className="lg:col-span-2" action={seletorPeriodo}>
                <GraficoReceita dados={d.receitaMensal} altura={200} temMeta={!!d.meta} />
              </Section>
              <Section title="Receita por tipo de serviço" sub="Distribuição no período">
                <Donut dados={d.receitaPorTipo} />
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrar entrar-2">
              <Section
                title="Atividade comercial"
                sub="Interações registradas por semana, últimas 8"
                className="lg:col-span-2"
                action={
                  <span className="text-[11px] text-[#968F88]">
                    <span className="font-mono text-[#C5C2BE]">{d.interacoes}</span> no período
                  </span>
                }
              >
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={d.atividadeSemanal} barGap={3} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#311C45" />
                    <XAxis dataKey="semana" tick={{ fill: "#968F88", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#968F88", fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="interacoes" name="Interações" fill="#B159C7" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
                {d.atividadePorCanal.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                    {d.atividadePorCanal.map((c, i) => (
                      <span key={c.nome} className="flex items-center gap-1.5 text-[11px] text-[#968F88]">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CORES[i % CORES.length] }} /> {c.nome}{" "}
                        <span className="font-mono text-[#C5C2BE]">{c.valor}</span>
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Clientes sem contato" sub="Com projeto em aberto, por tempo sem interação">
                {d.semContato.length === 0 ? (
                  <p className="text-xs text-[#5A496A]">Nenhum cliente com projeto em aberto.</p>
                ) : (
                  <div className="space-y-2.5">
                    {d.semContato.map((c) => {
                      const nivel = c.dias === null || c.dias > 30 ? "alto" : c.dias > 14 ? "medio" : "ok";
                      const cor = nivel === "alto" ? "#F87171" : nivel === "medio" ? "#FBBF24" : "#34D399";
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1">
                            <Link href={`/clientes/${c.id}?aba=relacionamento`} className="text-xs text-[#DDDBD9] font-medium hover:text-brand-400 truncate">
                              {c.nome}
                            </Link>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                                nivel === "alto" ? "text-red-400 bg-red-500/10 border-red-500/20" : nivel === "medio" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                              )}
                            >
                              {nivel === "alto" ? "Atenção" : nivel === "medio" ? "Médio" : "Em dia"}
                            </span>
                          </div>
                          <div className="h-1 bg-[#311C45] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((c.dias ?? 60) / 60) * 100)}%`, backgroundColor: cor }} />
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[10px] text-[#968F88] font-mono">{c.dias === null ? "nunca" : `${c.dias} dia(s) sem contato`}</span>
                            <span className="text-[10px] text-[#968F88]">{c.ultima ? fmtData(c.ultima, false) : "—"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>
          </>
        )}

        {visao === "receita" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
              <KpiCard label="Receita total" value={fmtK(d.receita)} sub={d.periodoLabel} {...tendencia(d.variacaoReceita)} />
              <KpiCard label="Média mensal" value={fmtK(d.mediaMensal)} sub={`em ${d.receitaMensal.length} mês(es)`} trend={d.meta ? `meta ${fmtK(d.meta)}/mês` : "sem meta definida"} trendUp={!d.meta || d.mediaMensal >= d.meta} />
              <KpiCard label="A receber" value={fmtK(d.aReceber)} sub="parcelas em aberto" trend={d.vencido > 0 ? `${fmt(d.vencido)} vencido` : "nada vencido"} trendUp={d.vencido === 0} />
              <KpiCard label="Melhor mês" value={d.melhorMes?.mes ?? "—"} sub={d.melhorMes ? fmt(d.melhorMes.valor) : "sem recebimentos"} trend={d.melhorMes && d.mediaMensal > 0 ? `${pct1(((d.melhorMes.valor - d.mediaMensal) / d.mediaMensal) * 100)} acima da média` : "—"} trendUp />
            </div>

            <Section title="Evolução mensal de receita" sub={`Recebido, previsto (parcelas em aberto) e meta, ${d.periodoLabel}`} className="entrar entrar-1">
              <GraficoReceita dados={d.receitaMensal} altura={260} temMeta={!!d.meta} comPrevisto />
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrar entrar-2">
              <Section title="Top 5 clientes por receita" sub="Recebido no período">
                {d.receitaPorCliente.length === 0 ? (
                  <p className="text-xs text-[#5A496A]">Nenhum recebimento no período.</p>
                ) : (
                  <div className="space-y-3">
                    {d.receitaPorCliente.map((c, i) => (
                      <div key={c.nome} className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-[#968F88] w-4 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs text-[#DDDBD9] font-medium truncate">{c.nome}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {c.variacao !== null && <span className={cn("text-[10px] font-medium", c.variacao >= 0 ? "text-emerald-400" : "text-red-400")}>{c.variacao >= 0 ? "+" : "−"}{pct1(c.variacao)}</span>}
                              <span className="text-xs font-mono text-[#C5C2BE]">{fmt(c.valor)}</span>
                            </div>
                          </div>
                          <div className="h-1 bg-[#311C45] rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(c.valor / d.receitaPorCliente[0].valor) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Receita por tipo de serviço" sub="Distribuição e participação">
                {d.receitaPorTipo.length === 0 ? (
                  <p className="text-xs text-[#5A496A]">Nenhum recebimento no período.</p>
                ) : (
                  <Barras dados={d.receitaPorTipo} moeda />
                )}
              </Section>
            </div>
          </>
        )}

        {visao === "funil" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
              <KpiCard label="Total de leads" value={String(d.totalLeads)} sub={d.periodoLabel} {...tendencia(d.variacaoLeads)} />
              <KpiCard
                label="Taxa de conversão"
                value={d.taxaConversao !== null ? pct1(d.taxaConversao) : "—"}
                sub="ganhos ÷ fechados"
                trend={d.variacaoConversao !== null ? `${pct1(d.variacaoConversao).replace("%", " pp")} vs. período anterior` : "sem base anterior"}
                trendUp={(d.variacaoConversao ?? 0) >= 0}
              />
              <KpiCard label="Tempo médio de ciclo" value={d.cicloMedio !== null ? `${d.cicloMedio} dias` : "—"} sub="prospecção → fechado" trend={d.cicloMedio !== null ? "dos negócios ganhos" : "nenhum ganho no período"} trendUp />
              <KpiCard label="Negócios perdidos" value={String(d.perdidos)} sub="no período" trend={d.totalLeads ? `${pct1((d.perdidos / d.totalLeads) * 100)} dos leads` : "—"} trendUp={false} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrar entrar-1">
              <Section title="Funil de conversão" sub={`Leads que passaram por cada etapa, ${d.periodoLabel}`}>
                <div className="space-y-3 mt-1">
                  {d.funil.map((s, i) => (
                    <div key={s.etapa} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[#968F88] w-4 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#DDDBD9]">{s.etapa}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-brand-400">{s.pct}%</span>
                            <span className="text-xs font-mono font-semibold text-[#C5C2BE]">{s.valor}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[#311C45] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: "linear-gradient(90deg, #B159C7, #A151B5)", opacity: 1 - i * 0.1 }} />
                        </div>
                      </div>
                      {i < d.funil.length - 1 && (
                        <span className="text-[10px] font-mono text-[#968F88] w-10 text-right shrink-0">{s.valor ? Math.round((d.funil[i + 1].valor / s.valor) * 100) : 0}%</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#311C45] flex items-center justify-between">
                  <span className="text-[11px] text-[#968F88]">Taxa global lead → fechado</span>
                  <span className="text-sm font-semibold font-mono text-brand-400">{d.funil[0]?.valor ? Math.round((d.funil[4].valor / d.funil[0].valor) * 100) : 0}%</span>
                </div>
              </Section>

              <Section title="Conversão por etapa" sub="Taxa entre etapas consecutivas">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={d.funil.slice(0, -1).map((s, i) => ({ name: s.etapa, taxa: s.valor ? Math.round((d.funil[i + 1].valor / s.valor) * 100) : 0 }))}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#311C45" />
                    <XAxis dataKey="name" tick={{ fill: "#968F88", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#968F88", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={32} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip sufixo="%" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="taxa" name="Conversão" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {d.funil.slice(0, -1).map((s, i) => {
                        const taxa = s.valor ? (d.funil[i + 1].valor / s.valor) * 100 : 0;
                        return <Cell key={i} fill={taxa >= 60 ? "#B159C7" : taxa >= 35 ? "#FBBF24" : "#F87171"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrar entrar-2">
              <Section title="Origem dos leads" sub="De onde vieram no período">
                {d.leadsPorOrigem.length === 0 ? <p className="text-xs text-[#5A496A]">Nenhum lead no período.</p> : <Barras dados={d.leadsPorOrigem} />}
              </Section>
              <Section title="Motivos de perda" sub="Os mais frequentes">
                {d.motivosPerda.length === 0 ? <p className="text-xs text-[#5A496A]">Nenhum negócio perdido no período.</p> : <Barras dados={d.motivosPerda} cor="#F87171" />}
              </Section>
            </div>
          </>
        )}

        {visao === "producao" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
              <KpiCard label="Projetos entregues" value={String(d.entregues)} sub="entregues ou concluídos" trend={`${d.emProducao.length} em produção agora`} trendUp />
              <KpiCard label="Prazo médio" value={d.prazoMedio !== null ? `${d.prazoMedio} dias` : "—"} sub="início → última etapa" trend={d.prazoMedio !== null ? "dos projetos entregues" : "nenhum entregue ainda"} trendUp />
              <KpiCard label="Entregas no prazo" value={d.noPrazoPct !== null ? `${d.noPrazoPct}%` : "—"} sub="dentro do prazo combinado" trend={d.noPrazoPct !== null ? (d.noPrazoPct >= 80 ? "bom ritmo" : "atenção aos prazos") : "—"} trendUp={(d.noPrazoPct ?? 100) >= 80} />
              <KpiCard label="Etapas atrasadas" value={String(d.etapasAtrasadas)} sub={`de ${d.etapasAbertas} em aberto`} trend={d.etapasAtrasadas ? "resolver hoje" : "tudo em dia"} trendUp={d.etapasAtrasadas === 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrar entrar-1">
              <Section title="Projetos por status" sub="Todos os projetos, hoje">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.projetosPorStatus} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#311C45" />
                    <XAxis dataKey="nome" tick={{ fill: "#968F88", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fill: "#968F88", fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="valor" name="Projetos" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {d.projetosPorStatus.map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
              <Section title="Tempo médio por tipo de serviço" sub="Dias do início até a última etapa concluída">
                {d.tempoPorTipo.length === 0 ? <p className="text-xs text-[#5A496A]">Ainda não há projetos entregues com data de início.</p> : <Barras dados={d.tempoPorTipo.map((t) => ({ nome: `${t.nome} (${t.n})`, valor: t.valor }))} sufixo=" dias" />}
              </Section>
            </div>

            <Section title="Em produção" sub="Progresso das etapas dos projetos em andamento" className="entrar entrar-2">
              {d.emProducao.length === 0 ? (
                <p className="text-xs text-[#5A496A]">Nenhum projeto em produção agora.</p>
              ) : (
                <div className="space-y-3">
                  {d.emProducao.map((p) => {
                    const pct = p.total ? Math.round((p.feitas / p.total) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <Link href={`/projetos/${p.id}?aba=etapas`} className="text-xs text-[#DDDBD9] font-medium hover:text-brand-400 truncate">
                              {p.nome} <span className="text-[#968F88] font-normal">· {p.cliente}</span>
                            </Link>
                            <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                              {p.atrasadas > 0 && <span className="text-red-400">{p.atrasadas} atrasada(s)</span>}
                              {p.prazo && <span className={cn(p.diasPrazo !== null && p.diasPrazo < 0 ? "text-red-400" : p.diasPrazo !== null && p.diasPrazo <= 7 ? "text-amber-400" : "text-[#968F88]")}>entrega {fmtData(p.prazo, false)}</span>}
                              <span className="text-[#C5C2BE]">{p.total ? `${p.feitas}/${p.total}` : "sem etapas"}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#311C45] rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", p.atrasadas ? "bg-red-400" : "bg-brand-400")} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Peças do Make ---------- */

type TooltipProps = { active?: boolean; payload?: Array<{ value: number; color?: string; stroke?: string; fill?: string; name?: string }>; label?: string; prefix?: string; sufixo?: string };
function ChartTooltip({ active, payload, label, prefix = "", sufixo = "" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#311C45] border border-[#5A496A] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#968F88] mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono" style={{ color: p.color ?? p.stroke ?? p.fill }}>
          {p.name && <span className="text-[#968F88] mr-1.5">{p.name}</span>}
          {prefix}
          {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
          {sufixo}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, trend, trendUp }: { label: string; value: string; sub: string; trend: string; trendUp: boolean }) {
  return (
    <div className="bg-[#231431] border border-[#311C45] rounded-xl p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#968F88] mb-3">{label}</p>
      <p className="text-2xl font-semibold font-mono text-[#F5F5F4] tracking-tight">{value}</p>
      <p className="text-[11px] text-[#968F88] mt-0.5 mb-3">{sub}</p>
      <div className={cn("inline-flex items-center gap-1 text-xs font-medium", trendUp ? "text-emerald-400" : "text-red-400")}>
        <span>{trendUp ? "↑" : "↓"}</span>
        {trend}
      </div>
    </div>
  );
}

function Section({ title, sub, children, action, className }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-[#231431] border border-[#311C45] rounded-xl p-5", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <p className="text-sm font-semibold text-[#F5F5F4]">{title}</p>
          {sub && <p className="text-xs text-[#968F88] mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function PeriodSelector({ value, onChange }: { value: Periodo; onChange: (v: Periodo) => void }) {
  return (
    <div className="flex gap-1">
      {PERIODOS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap", value === o.id ? "bg-brand-400/15 text-brand-400" : "text-[#968F88] hover:text-[#DDDBD9]")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GraficoReceita({ dados, altura, temMeta, comPrevisto }: { dados: DadosRelatorio["receitaMensal"]; altura: number; temMeta: boolean; comPrevisto?: boolean }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <AreaChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="relGr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B159C7" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#B159C7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="relGm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#311C45" />
          <XAxis dataKey="mes" tick={{ fill: "#968F88", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#968F88", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} width={36} />
          <Tooltip content={<ChartTooltip prefix="R$ " />} />
          {temMeta && <Area type="monotone" dataKey="meta" name="Meta" stroke="#34D399" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#relGm)" dot={false} isAnimationActive={false} />}
          {comPrevisto && <Area type="monotone" dataKey="previsto" name="Previsto" stroke="#FBBF24" strokeWidth={1.5} strokeDasharray="2 3" fill="none" dot={false} />}
          <Area type="monotone" dataKey="receita" name="Receita" stroke="#B159C7" strokeWidth={2} fill="url(#relGr)" dot={false} activeDot={{ r: 4, fill: "#B159C7", stroke: "#150C1D", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-[#968F88]">
          <span className="w-3 h-0.5 bg-brand-400 rounded-full inline-block" /> Receita
        </span>
        {temMeta && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#968F88]">
            <span className="w-3 border-t border-dashed border-emerald-500 inline-block" /> Meta
          </span>
        )}
        {comPrevisto && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#968F88]">
            <span className="w-3 border-t border-dotted border-amber-400 inline-block" /> Previsto (a receber)
          </span>
        )}
      </div>
    </>
  );
}

function Donut({ dados }: { dados: Serie[] }) {
  if (dados.length === 0) return <p className="text-xs text-[#5A496A]">Nenhum recebimento no período.</p>;
  const total = dados.reduce((s, x) => s + x.valor, 0);
  return (
    <>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={dados} cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="valor" nameKey="nome" stroke="none">
            {dados.map((_, i) => (
              <Cell key={i} fill={CORES[i % CORES.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              return (
                <div className="bg-[#311C45] border border-[#5A496A] rounded-lg px-3 py-2 text-xs">
                  <p style={{ color: p.payload.fill }} className="font-medium">
                    {p.name}
                  </p>
                  <p className="font-mono text-[#C5C2BE]">{fmt(Number(p.value))}</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-2">
        {dados.map((x, i) => (
          <div key={x.nome} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CORES[i % CORES.length] }} />
            <span className="text-[11px] text-[#C5C2BE] flex-1 truncate">{x.nome}</span>
            <span className="text-[11px] font-mono text-[#968F88]">{fmt(x.valor)}</span>
            <span className="text-[10px] font-mono text-[#968F88] w-8 text-right">{Math.round((x.valor / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Lista de barras horizontais (Receita por segmento do Make). */
function Barras({ dados, moeda, sufixo = "", cor }: { dados: Serie[]; moeda?: boolean; sufixo?: string; cor?: string }) {
  const max = Math.max(...dados.map((x) => x.valor), 1);
  const total = dados.reduce((s, x) => s + x.valor, 0);
  return (
    <div className="space-y-4">
      {dados.map((x, i) => (
        <div key={x.nome}>
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor ?? CORES[i % CORES.length] }} />
              <span className="text-xs text-[#DDDBD9] font-medium truncate">{x.nome}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!sufixo && <span className="text-[10px] font-mono text-[#968F88]">{total ? Math.round((x.valor / total) * 100) : 0}%</span>}
              <span className="text-xs font-mono text-[#C5C2BE]">{moeda ? fmt(x.valor) : `${x.valor}${sufixo}`}</span>
            </div>
          </div>
          <div className="h-1.5 bg-[#311C45] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(x.valor / max) * 100}%`, backgroundColor: cor ?? CORES[i % CORES.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
