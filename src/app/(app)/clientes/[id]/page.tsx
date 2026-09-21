import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectInline } from "@/components/ui/select-inline";
import { Avatar, BotaoGhost, BotaoLinha, BotaoPrimario, Card, CardTitulo, Header, KpiCard, Pill, Td, Th, Tr } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { CONTATO_PREFERIDO_LABEL, FORMA_PAGAMENTO_LABEL, ORIGEM_CLIENTE_LABEL, STATUS_PROJETO_LABEL, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { FASE_CLIENTE_LABEL, FASE_CLIENTE_TOM, faseCliente } from "@/lib/fase-cliente";
import { diffDias, fmt, fmtData, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaTarefa, Cliente, Interacao, Pagamento, Projeto, Tarefa } from "@/lib/types";
import { adiarFollowup, concluirFollowup, excluirInteracao, registrarInteracao, salvarFollowup, type Dono } from "../../crm/actions";
import { PainelRelacionamento } from "../../crm/painel-relacionamento";
import { tomStatus } from "../../projetos/status-tom";
import { excluirCliente, mudarStatusCliente } from "../actions";
import { EditarClienteBotao } from "./editar-botao";
import { TarefasCliente } from "./tarefas-cliente";

const ABAS = [
  { id: "geral", label: "Visão geral" },
  { id: "relacionamento", label: "Relacionamento" },
  { id: "financeiro", label: "Financeiro" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

/*
 * Página do cliente = zona de produção (pós-fechamento). O CRM (follow-up + interações) fica na aba
 * Relacionamento; a Visão geral mostra cadastro completo, projetos com progresso das etapas e próximas tarefas.
 */
export default async function ClientePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { id } = await params;
  const { aba: abaParam } = await searchParams;
  const aba: Aba = ABAS.some((a) => a.id === abaParam) ? (abaParam as Aba) : "geral";
  const supabase = await createClient();

  const [{ data: cliente }, { data: projetos }, { data: interacoes }, { data: tarefasCliente }, { data: categorias }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single<Cliente>(),
    supabase.from("projetos").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).returns<Projeto[]>(),
    supabase.from("interacoes").select("*").eq("cliente_id", id).order("data", { ascending: false }).order("criado_em", { ascending: false }).returns<Interacao[]>(),
    supabase.from("tarefas").select("*").eq("cliente_id", id).returns<Tarefa[]>(),
    supabase.from("categorias_tarefa").select("*").order("ordem").returns<CategoriaTarefa[]>(),
  ]);
  if (!cliente) notFound();

  const ids = (projetos ?? []).map((p) => p.id);
  const [{ data: pagamentos }, { data: tarefasProjetos }] = ids.length
    ? await Promise.all([
        supabase.from("pagamentos_view").select("*").in("projeto_id", ids).order("vencimento").returns<Pagamento[]>(),
        supabase.from("tarefas").select("*").in("projeto_id", ids).returns<Tarefa[]>(),
      ])
    : [{ data: [] as Pagamento[] }, { data: [] as Tarefa[] }];

  const lista = projetos ?? [];
  const ativos = lista.filter((p) => p.status !== "cancelado");
  const pags = pagamentos ?? [];
  const valorTotal = ativos.reduce((s, p) => s + Number(p.valor_total ?? 0), 0);
  const recebido = pags.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const pendente = pags.filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.valor), 0);
  const atrasado = pags.filter((p) => p.status === "atrasado").reduce((s, p) => s + Number(p.valor), 0);
  const fase = faseCliente(lista);
  const hoje = hojeISO();

  // Tarefas do cliente = as ligadas direto a ele + as dos projetos dele
  const todasTarefas: Array<Tarefa & { projetoNome: string | null }> = [
    ...(tarefasCliente ?? []).map((t) => ({ ...t, projetoNome: null })),
    ...(tarefasProjetos ?? []).map((t) => ({ ...t, projetoNome: lista.find((p) => p.id === t.projeto_id)?.nome ?? null })),
  ];
  const progressoProjeto = (projetoId: string) => {
    const ts = (tarefasProjetos ?? []).filter((t) => t.projeto_id === projetoId);
    const feitas = ts.filter((t) => t.concluida_em).length;
    const proxima = ts.filter((t) => !t.concluida_em).sort((a, b) => (a.vencimento ?? "9999").localeCompare(b.vencimento ?? "9999"))[0];
    return { total: ts.length, feitas, pct: ts.length ? Math.round((feitas / ts.length) * 100) : 0, proxima };
  };

  const followupAtrasado = !!cliente.proximo_followup && cliente.proximo_followup <= hoje;
  const dono: Dono = { tipo: "cliente", id: cliente.id };
  const acoes = {
    registrarInteracao: registrarInteracao.bind(null, dono),
    excluirInteracao: excluirInteracao.bind(null, dono),
    salvarFollowup: salvarFollowup.bind(null, dono),
    concluirFollowup: concluirFollowup.bind(null, dono),
    adiarFollowup: adiarFollowup.bind(null, dono),
  };
  const excluir = excluirCliente.bind(null, cliente.id);
  const mudarStatus = mudarStatusCliente.bind(null, cliente.id);

  return (
    <>
      <Header
        titulo={cliente.empresa ?? cliente.nome}
        sub={
          <>
            <Link href="/clientes" className="hover:text-[#DDDBD9]">
              Clientes
            </Link>{" "}
            › {cliente.empresa ? cliente.nome : (cliente.nicho ?? "cliente")}
            {cliente.lead_id && (
              <>
                {" "}
                ·{" "}
                <Link href={`/pipeline/${cliente.lead_id}`} className="text-brand-400 hover:text-brand-300">
                  veio do pipeline
                </Link>
              </>
            )}
          </>
        }
      >
        <Pill tom={FASE_CLIENTE_TOM[fase]}>{FASE_CLIENTE_LABEL[fase]}</Pill>
        <SelectInline
          name="status"
          label="Status"
          value={cliente.status}
          opcoes={[
            { valor: "ativo", label: "Ativo" },
            { valor: "inativo", label: "Inativo" },
          ]}
          action={mudarStatus}
        />
        <EditarClienteBotao cliente={cliente} />
        <BotaoPrimario href={`/projetos?novo=1&cliente=${cliente.id}`}>Novo projeto</BotaoPrimario>
      </Header>

      {/* Abas (mesmo padrão da página do projeto) */}
      <div className="flex items-center gap-1 px-4 md:px-6 border-b border-[#311C45] shrink-0 overflow-x-auto">
        {ABAS.map((a) => {
          const alerta = (a.id === "relacionamento" && followupAtrasado) || (a.id === "financeiro" && atrasado > 0);
          return (
            <Link
              key={a.id}
              href={`/clientes/${cliente.id}?aba=${a.id}`}
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap",
                aba === a.id ? "border-brand-400 text-brand-400" : "border-transparent text-[#968F88] hover:text-[#DDDBD9]",
              )}
            >
              {a.label}
              {alerta && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
            </Link>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        {aba === "geral" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
              <KpiCard label="Valor total" value={fmt(valorTotal)} sub={`${ativos.length} projeto(s)`} />
              <KpiCard label="Recebido" value={fmt(recebido)} accent="text-emerald-400" sub={`${pags.filter((p) => p.status === "pago").length} pagamento(s)`} />
              <KpiCard label="A receber" value={fmt(pendente + atrasado)} accent={atrasado > 0 ? "text-red-400" : "text-amber-400"} sub={atrasado > 0 ? `${fmt(atrasado)} em atraso` : "nada em atraso"} />
              <KpiCard
                label="Tarefas abertas"
                value={String(todasTarefas.filter((t) => !t.concluida_em).length)}
                accent={todasTarefas.some((t) => !t.concluida_em && t.vencimento && t.vencimento < hoje) ? "text-red-400" : undefined}
                sub={`${todasTarefas.filter((t) => t.concluida_em).length} concluída(s)`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrar entrar-1">
              {/* Cadastro */}
              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar nome={cliente.empresa ?? cliente.nome} tamanho={11} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#F5F5F4] truncate">{cliente.nome}</p>
                    <p className="text-[11px] text-[#968F88] truncate">{cliente.nicho ?? "Nicho não informado"}</p>
                  </div>
                </div>
                <dl className="space-y-2.5 text-xs">
                  <Linha k="WhatsApp">
                    {cliente.whatsapp ? (
                      <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300">
                        {cliente.whatsapp}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Linha>
                  <Linha k="E-mail">
                    {cliente.email ? (
                      <a href={`mailto:${cliente.email}`} className="font-mono text-brand-400 hover:text-brand-300">
                        {cliente.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Linha>
                  <Linha k="Instagram">
                    {cliente.instagram ? (
                      <a href={`https://instagram.com/${cliente.instagram}`} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300">
                        @{cliente.instagram}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Linha>
                  <Linha k="Site">
                    {cliente.site ? (
                      <a href={cliente.site.startsWith("http") ? cliente.site : `https://${cliente.site}`} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300">
                        {cliente.site.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Linha>
                  <Linha k="Prefere">{cliente.contato_preferido ? CONTATO_PREFERIDO_LABEL[cliente.contato_preferido] : "—"}</Linha>
                  <Linha k="CPF / CNPJ">{cliente.documento ? <span className="font-mono">{cliente.documento}</span> : "—"}</Linha>
                  <Linha k="Origem">{cliente.origem ? (ORIGEM_CLIENTE_LABEL[cliente.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? cliente.origem) : "—"}</Linha>
                  <Linha k="Cliente desde">{fmtData(cliente.criado_em)}</Linha>
                </dl>
                {cliente.endereco && (
                  <Secao titulo="Endereço">
                    <p className="text-[11px] text-[#C5C2BE] leading-relaxed">{cliente.endereco}</p>
                  </Secao>
                )}
                {cliente.acessos && (
                  <Secao titulo="Acessos e links">
                    <p className="text-[11px] text-[#C5C2BE] leading-relaxed whitespace-pre-wrap break-words">{cliente.acessos}</p>
                  </Secao>
                )}
                {cliente.observacoes && (
                  <Secao titulo="Observações">
                    <p className="text-[11px] text-[#C5C2BE] leading-relaxed whitespace-pre-wrap">{cliente.observacoes}</p>
                  </Secao>
                )}
                <form action={excluir} className="border-t border-[#311C45] pt-3">
                  <button type="submit" className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors">
                    Excluir cliente (apaga projetos e pagamentos)
                  </button>
                </form>
              </Card>

              {/* Projetos com progresso das etapas */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#311C45]">
                    <CardTitulo sub={`${lista.length} no total · ${ativos.filter((p) => !["entregue", "concluido"].includes(p.status)).length} em andamento`}>Projetos</CardTitulo>
                    <BotaoGhost href={`/projetos?novo=1&cliente=${cliente.id}`}>+ Projeto</BotaoGhost>
                  </div>
                  {lista.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-[#968F88]">Nenhum projeto ainda.</p>
                  ) : (
                    <ul className="divide-y divide-[#311C45]/60">
                      {lista.map((p) => {
                        const prog = progressoProjeto(p.id);
                        const dias = p.prazo_entrega ? diffDias(hoje, p.prazo_entrega) : null;
                        const emAndamento = !["entregue", "concluido", "cancelado"].includes(p.status);
                        return (
                          <li key={p.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link href={`/projetos/${p.id}`} className="text-sm font-medium text-[#DDDBD9] hover:text-brand-400 transition-colors">
                                  {p.nome}
                                </Link>
                                <p className="text-[11px] text-[#968F88] mt-0.5">
                                  {p.tipo ?? "Sem tipo"} · <span className="font-mono">{fmt(p.valor_total)}</span>
                                  {p.prazo_entrega && (
                                    <>
                                      {" "}
                                      · prazo{" "}
                                      <span className={cn("font-mono", emAndamento && dias !== null && dias < 0 ? "text-red-400" : emAndamento && dias !== null && dias <= 7 ? "text-amber-400" : "")}>
                                        {fmtData(p.prazo_entrega, false)}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Pill tom={tomStatus(p.status)}>{STATUS_PROJETO_LABEL[p.status]}</Pill>
                                <BotaoLinha href={`/projetos/${p.id}`}>Abrir</BotaoLinha>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1 h-1 bg-[#311C45] rounded-full overflow-hidden">
                                <div className="h-full bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${prog.pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-[#968F88] whitespace-nowrap">
                                {prog.total ? `${prog.feitas}/${prog.total} etapas` : "sem etapas"}
                              </span>
                            </div>
                            {prog.proxima && (
                              <p className="mt-1.5 text-[11px] text-[#968F88] truncate">
                                Próxima: <span className="text-[#C5C2BE]">{prog.proxima.titulo}</span>
                                {prog.proxima.vencimento && <span className="font-mono"> · {fmtData(prog.proxima.vencimento, false)}</span>}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <Card>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <CardTitulo sub="Do cliente e dos projetos dele">Próximas tarefas</CardTitulo>
                    <BotaoGhost href={`/tarefas?nova=1&cliente=${cliente.id}`}>+ Tarefa</BotaoGhost>
                  </div>
                  <TarefasCliente tarefas={todasTarefas} categorias={categorias ?? []} />
                </Card>
              </div>
            </div>
          </>
        )}

        {aba === "relacionamento" && (
          <div className="entrar">
            <PainelRelacionamento dono={dono} followup={{ data: cliente.proximo_followup, nota: cliente.nota_followup }} interacoes={interacoes ?? []} acoes={acoes} />
          </div>
        )}

        {aba === "financeiro" && (
          <div className="space-y-5 entrar">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
              <KpiCard label="Contratado" value={fmt(valorTotal)} sub={`${ativos.length} projeto(s)`} />
              <KpiCard label="Recebido" value={fmt(recebido)} accent="text-emerald-400" />
              <KpiCard label="A receber" value={fmt(pendente)} accent="text-amber-400" />
              <KpiCard label="Vencido" value={fmt(atrasado)} accent={atrasado > 0 ? "text-red-400" : undefined} />
            </div>
            <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#311C45]">
                <CardTitulo sub={`${pags.length} lançamento(s) em todos os projetos`}>Pagamentos</CardTitulo>
                <BotaoGhost href="/financeiro">Abrir Financeiro</BotaoGhost>
              </div>
              {pags.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-[#968F88]">Nenhum lançamento ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-[#311C45]">
                        <Th>Projeto</Th>
                        <Th>Tipo</Th>
                        <Th>Vencimento</Th>
                        <Th>Pagamento</Th>
                        <Th>Valor</Th>
                        <Th>Status</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {pags.map((p) => (
                        <Tr key={p.id}>
                          <Td className="font-medium text-[#DDDBD9]">{lista.find((x) => x.id === p.projeto_id)?.nome ?? "—"}</Td>
                          <Td className="font-mono text-[#968F88]">{p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : "—"}</Td>
                          <Td className={cn("font-mono", p.status === "atrasado" ? "text-red-400" : "text-[#968F88]")}>{fmtData(p.vencimento)}</Td>
                          <Td className="font-mono text-[#968F88]">
                            {p.data_pagamento ? fmtData(p.data_pagamento) : "—"}
                            {p.forma_pagamento && <span className="ml-1.5 text-[10px]">{FORMA_PAGAMENTO_LABEL[p.forma_pagamento as keyof typeof FORMA_PAGAMENTO_LABEL] ?? p.forma_pagamento}</span>}
                          </Td>
                          <Td className={cn("font-mono font-semibold", p.status === "pago" ? "text-emerald-400" : p.status === "atrasado" ? "text-red-400" : "text-[#DDDBD9]")}>{fmt(p.valor)}</Td>
                          <Td>{p.status === "pago" ? <Pill tom="success">Pago</Pill> : p.status === "atrasado" ? <Pill tom="error">Vencido</Pill> : <Pill tom="warning">Pendente</Pill>}</Td>
                          <Td>
                            <BotaoLinha href={`/projetos/${p.projeto_id}?aba=pagamentos`}>Abrir</BotaoLinha>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Linha({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#968F88] shrink-0">{k}</dt>
      <dd className="text-[#DDDBD9] truncate">{children}</dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#311C45] pt-3">
      <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-1.5">{titulo}</p>
      {children}
    </div>
  );
}
