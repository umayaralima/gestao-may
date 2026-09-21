import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectInline } from "@/components/ui/select-inline";
import { Avatar, BotaoGhost, Card, CardTitulo, Header, KpiCard, Pill } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { STATUS_PROJETO, STATUS_PROJETO_LABEL } from "@/lib/constantes";
import { diffDias, fmt, fmtData, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Briefing, CategoriaTarefa, Contrato, Pagamento, Projeto, Tarefa } from "@/lib/types";
import { aprovarProjeto, criarContrato, excluirProjeto, mudarStatusProjeto, salvarBriefing } from "../actions";
import { tomStatus } from "../status-tom";
import { BriefingForm } from "./briefing-form";
import { Contratos } from "./contratos";
import { EditarProjetoBotao } from "./editar-botao";
import { PagamentosProjeto } from "./pagamentos-projeto";
import { TarefasProjeto } from "./tarefas-projeto";

type ProjetoJoin = Projeto & { clientes: { id: string; nome: string; empresa: string | null } | null };
const ABAS = [
  { id: "geral", label: "Visão geral" },
  { id: "briefing", label: "Briefing" },
  { id: "contrato", label: "Contrato" },
  { id: "pagamentos", label: "Pagamentos" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export default async function ProjetoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { id } = await params;
  const { aba: abaParam } = await searchParams;
  const aba: Aba = ABAS.some((a) => a.id === abaParam) ? (abaParam as Aba) : "geral";
  const supabase = await createClient();

  const [{ data: projeto }, { data: pagamentos }, { data: briefing }, { data: contratos }, { data: clientes }, { data: tipos }, { data: tarefas }, { data: categorias }] = await Promise.all([
    supabase.from("projetos").select("*, clientes(id, nome, empresa)").eq("id", id).single<ProjetoJoin>(),
    supabase.from("pagamentos_view").select("*").eq("projeto_id", id).order("vencimento").returns<Pagamento[]>(),
    supabase.from("briefings").select("*").eq("projeto_id", id).maybeSingle<Briefing>(),
    supabase.from("contratos").select("*").eq("projeto_id", id).order("criado_em", { ascending: false }).returns<Contrato[]>(),
    supabase.from("clientes").select("id, nome, empresa").order("nome"),
    supabase.from("tipos_projeto").select("nome").order("ordem").order("nome"),
    supabase.from("tarefas").select("*").eq("projeto_id", id).order("vencimento", { ascending: true, nullsFirst: false }).order("criado_em").returns<Tarefa[]>(),
    supabase.from("categorias_tarefa").select("*").order("ordem").returns<CategoriaTarefa[]>(),
  ]);
  if (!projeto) notFound();

  const lista = pagamentos ?? [];
  const totalPago = lista.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const totalPendente = lista.filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.valor), 0);
  const atrasados = lista.filter((p) => p.status === "atrasado");
  const totalAtrasado = atrasados.reduce((s, p) => s + Number(p.valor), 0);
  const naoParcelado = projeto.valor_total !== null ? Number(projeto.valor_total) - totalPago - totalPendente - totalAtrasado : null;

  const listaContratos = contratos ?? [];
  const temAssinado = listaContratos.some((c) => c.status === "assinado");
  const sugerirAprovado = temAssinado && ["briefing", "orcamento_enviado"].includes(projeto.status);

  const hoje = hojeISO();
  const diasPrazo = projeto.prazo_entrega ? diffDias(hoje, projeto.prazo_entrega) : null;
  const emAndamento = !["entregue", "concluido", "cancelado"].includes(projeto.status);

  const mudarStatus = mudarStatusProjeto.bind(null, projeto.id);
  const salvarBriefingDoProjeto = salvarBriefing.bind(null, projeto.id);
  const criarContratoDoProjeto = criarContrato.bind(null, projeto.id);
  const aprovar = aprovarProjeto.bind(null, projeto.id);
  const excluir = excluirProjeto.bind(null, projeto.id, projeto.cliente_id);
  const clienteNome = projeto.clientes?.empresa ?? projeto.clientes?.nome ?? "—";

  return (
    <>
      <Header
        titulo={projeto.nome}
        sub={
          <>
            <Link href="/projetos" className="hover:text-[#DDDBD9]">
              Projetos
            </Link>{" "}
            ›{" "}
            <Link href={`/clientes/${projeto.cliente_id}`} className="hover:text-[#DDDBD9]">
              {clienteNome}
            </Link>
            {projeto.tipo && ` · ${projeto.tipo}`}
          </>
        }
      >
        <SelectInline name="status" label="Status" value={projeto.status} opcoes={STATUS_PROJETO.map((s) => ({ valor: s, label: STATUS_PROJETO_LABEL[s] }))} action={mudarStatus} />
        <EditarProjetoBotao projeto={projeto} clientes={clientes ?? []} tipos={(tipos ?? []).map((t) => t.nome)} />
      </Header>

      {/* Abas */}
      <div className="flex items-center gap-1 px-4 md:px-6 border-b border-[#311C45] shrink-0 overflow-x-auto">
        {ABAS.map((a) => {
          const marcador = (a.id === "briefing" && briefing) || (a.id === "contrato" && temAssinado) ? "ok" : a.id === "pagamentos" && atrasados.length ? "alerta" : null;
          return (
            <Link
              key={a.id}
              href={`/projetos/${projeto.id}?aba=${a.id}`}
              className={cn(
                "px-3 py-2.5 text-[11px] font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5",
                aba === a.id ? "border-brand-400 text-brand-400" : "border-transparent text-[#968F88] hover:text-[#DDDBD9]",
              )}
            >
              {a.label}
              {marcador === "ok" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              {marcador === "alerta" && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
            </Link>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        {atrasados.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 entrar">
            <p className="text-xs text-red-400 font-medium">
              {atrasados.length} pagamento(s) vencido(s) · <span className="font-mono">{fmt(totalAtrasado)}</span>
            </p>
            <Link href={`/projetos/${projeto.id}?aba=pagamentos`} className="text-xs text-red-400 hover:text-red-300 font-medium">
              Ver parcelas →
            </Link>
          </div>
        )}
        {sugerirAprovado && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-400/30 bg-brand-400/10 px-5 py-3 entrar">
            <p className="text-xs text-[#DDDBD9]">
              Contrato assinado. Quer mudar o projeto pra <strong className="text-brand-300">Aprovado</strong>?
            </p>
            <form action={aprovar}>
              <button type="submit" className="px-3 py-1.5 bg-brand-400 hover:bg-brand-300 text-white text-xs font-semibold rounded-lg transition-colors">
                Sim, aprovar
              </button>
            </form>
          </div>
        )}

        {aba === "geral" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
              <KpiCard label="Valor do projeto" value={fmt(projeto.valor_total)} sub={naoParcelado !== null && Math.abs(naoParcelado) > 0.009 ? `${fmt(naoParcelado)} sem parcela` : "tudo parcelado"} />
              <KpiCard label="Recebido" value={fmt(totalPago)} accent="text-emerald-400" sub={`${lista.filter((p) => p.status === "pago").length} pago(s)`} />
              <KpiCard label="A receber" value={fmt(totalPendente + totalAtrasado)} accent={totalAtrasado > 0 ? "text-red-400" : "text-amber-400"} sub={totalAtrasado > 0 ? `${fmt(totalAtrasado)} vencido` : `${lista.filter((p) => p.status === "pendente").length} pendente(s)`} />
              <KpiCard
                label="Prazo"
                value={projeto.prazo_entrega ? fmtData(projeto.prazo_entrega, false) : "—"}
                accent={diasPrazo !== null && emAndamento && diasPrazo < 0 ? "text-red-400" : diasPrazo !== null && emAndamento && diasPrazo <= 7 ? "text-amber-400" : undefined}
                sub={diasPrazo === null ? "sem prazo definido" : !emAndamento ? STATUS_PROJETO_LABEL[projeto.status] : diasPrazo < 0 ? `${Math.abs(diasPrazo)} dia(s) atrasado` : diasPrazo === 0 ? "entrega hoje" : `faltam ${diasPrazo} dia(s)`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrar entrar-1">
              <Card className="lg:col-span-2 space-y-4">
                <CardTitulo>Detalhes</CardTitulo>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <Item k="Cliente">
                    <Link href={`/clientes/${projeto.cliente_id}`} className="flex items-center gap-2 text-brand-400 hover:text-brand-300">
                      <Avatar nome={clienteNome} tamanho={7} /> {clienteNome}
                    </Link>
                  </Item>
                  <Item k="Status">
                    <Pill tom={tomStatus(projeto.status)}>{STATUS_PROJETO_LABEL[projeto.status]}</Pill>
                  </Item>
                  <Item k="Tipo de serviço">{projeto.tipo ?? "—"}</Item>
                  <Item k="Início">{fmtData(projeto.data_inicio)}</Item>
                  <Item k="Link">
                    {projeto.link_projeto ? (
                      <a href={projeto.link_projeto} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300 break-all">
                        {projeto.link_projeto.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Item>
                  <Item k="Criado em">{fmtData(projeto.criado_em)}</Item>
                </dl>
                <div className="border-t border-[#311C45] pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-1.5">Observações</p>
                  {projeto.observacoes ? <p className="text-xs text-[#C5C2BE] leading-relaxed whitespace-pre-wrap">{projeto.observacoes}</p> : <p className="text-xs text-[#5A496A]">Nada anotado ainda.</p>}
                </div>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardTitulo>Andamento</CardTitulo>
                  <div className="mt-3 space-y-3">
                    <Passo ok={!!briefing} label="Briefing" href={`/projetos/${projeto.id}?aba=briefing`} acao={briefing ? "Preenchido" : "Preencher"} />
                    <Passo
                      ok={temAssinado}
                      alerta={!temAssinado && listaContratos.some((c) => c.status === "enviado")}
                      label="Contrato"
                      href={`/projetos/${projeto.id}?aba=contrato`}
                      acao={temAssinado ? "Assinado" : listaContratos.some((c) => c.status === "enviado") ? "Aguardando assinatura" : listaContratos.length ? "Rascunho" : "Criar"}
                    />
                    <Passo
                      ok={(tarefas ?? []).length > 0 && (tarefas ?? []).every((t) => t.concluida_em)}
                      alerta={(tarefas ?? []).some((t) => !t.concluida_em && t.vencimento && t.vencimento < hojeISO())}
                      label="Tarefas"
                      href={`/tarefas?nova=1&projeto=${projeto.id}`}
                      acao={(tarefas ?? []).length ? `${(tarefas ?? []).filter((t) => t.concluida_em).length}/${(tarefas ?? []).length} feitas` : "Criar"}
                    />
                    <Passo ok={lista.length > 0 && atrasados.length === 0} alerta={atrasados.length > 0} label="Pagamentos" href={`/projetos/${projeto.id}?aba=pagamentos`} acao={lista.length ? `${lista.filter((p) => p.status === "pago").length}/${lista.length} pagos` : "Cadastrar parcelas"} />
                  </div>
                </Card>
                <form action={excluir}>
                  <button type="submit" className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors">
                    Excluir projeto (apaga briefing, contratos e pagamentos)
                  </button>
                </form>
              </div>
            </div>

            <Card className="entrar entrar-2">
              <div className="flex items-center justify-between gap-3 mb-4">
                <CardTitulo sub="Etapas de produção e pendências deste projeto. Aparecem também na agenda de Tarefas.">Tarefas do projeto</CardTitulo>
                <BotaoGhost href={`/tarefas?nova=1&projeto=${projeto.id}`}>+ Tarefa</BotaoGhost>
              </div>
              <TarefasProjeto tarefas={tarefas ?? []} categorias={categorias ?? []} />
            </Card>
          </>
        )}

        {aba === "briefing" && (
          <div className="entrar">
            <BriefingForm action={salvarBriefingDoProjeto} briefing={briefing ?? null} />
          </div>
        )}
        {aba === "contrato" && (
          <div className="entrar">
            <Contratos contratos={listaContratos} criar={criarContratoDoProjeto} />
          </div>
        )}
        {aba === "pagamentos" && (
          <div className="entrar">
            <PagamentosProjeto pagamentos={lista} projetoId={projeto.id} />
          </div>
        )}
      </div>
    </>
  );
}

function Item({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[#968F88]">{k}</dt>
      <dd className="mt-0.5 text-[#DDDBD9]">{children}</dd>
    </div>
  );
}

function Passo({ ok, alerta, label, acao, href }: { ok: boolean; alerta?: boolean; label: string; acao: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg border border-[#311C45] hover:border-[#5A496A] px-3 py-2.5 transition-colors">
      <div className="flex items-center gap-2.5">
        <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", ok ? "bg-emerald-500 border-emerald-500" : alerta ? "border-amber-400" : "border-[#5A496A]")}>
          {ok && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5l2.5 2.5 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-xs font-medium text-[#DDDBD9]">{label}</span>
      </div>
      <span className={cn("text-[11px]", ok ? "text-emerald-400" : alerta ? "text-amber-400" : "text-[#968F88]")}>{acao}</span>
    </Link>
  );
}
