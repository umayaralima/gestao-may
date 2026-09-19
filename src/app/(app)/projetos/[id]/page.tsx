import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeProjeto } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Card, CardTitulo } from "@/components/ui/card";
import { PaginaHeader } from "@/components/ui/pagina";
import { cn } from "@/lib/cn";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Briefing, Contrato, Pagamento, Projeto } from "@/lib/types";
import { ListaPagamentos } from "../../pagamentos/lista-pagamentos";
import { PagamentoForm } from "../../pagamentos/pagamento-form";
import { excluirProjeto, mudarStatusProjeto } from "../actions";
import { StatusForm } from "./status-form";
import { salvarBriefing } from "./briefing/actions";
import { BriefingForm } from "./briefing/briefing-form";
import { aprovarProjeto, criarContrato } from "./contrato/actions";
import { ListaContratos } from "./contrato/lista-contratos";
import { NovoContratoForm } from "./contrato/novo-contrato-form";

type ProjetoComCliente = Projeto & { clientes: { id: string; nome: string; empresa: string | null } | null };

const abas = [
  { id: "geral", label: "Visão geral" },
  { id: "briefing", label: "Briefing" },
  { id: "contrato", label: "Contrato" },
  { id: "pagamentos", label: "Pagamentos" },
] as const;
type Aba = (typeof abas)[number]["id"];

export default async function ProjetoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba: abaParam } = await searchParams;
  const aba: Aba = abas.some((a) => a.id === abaParam) ? (abaParam as Aba) : "geral";

  const supabase = await createClient();
  const [{ data: projeto }, { data: pagamentos }, { data: briefing }, { data: contratos }] = await Promise.all([
    supabase.from("projetos").select("*, clientes(id, nome, empresa)").eq("id", id).single<ProjetoComCliente>(),
    supabase.from("pagamentos_view").select("*").eq("projeto_id", id).order("vencimento").returns<Pagamento[]>(),
    supabase.from("briefings").select("*").eq("projeto_id", id).maybeSingle<Briefing>(),
    supabase.from("contratos").select("*").eq("projeto_id", id).order("criado_em", { ascending: false }).returns<Contrato[]>(),
  ]);
  if (!projeto) notFound();

  const lista = pagamentos ?? [];
  const totalPago = lista.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const totalPendente = lista.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.valor), 0);
  const atrasados = lista.filter((p) => p.status === "atrasado");

  const listaContratos = contratos ?? [];
  const temAssinado = listaContratos.some((c) => c.status === "assinado");
  // Regra: contrato assinado sugere (não força) projeto aprovado
  const sugerirAprovado = temAssinado && ["briefing", "orcamento_enviado"].includes(projeto.status);

  const mudarStatus = mudarStatusProjeto.bind(null, projeto.id);
  const salvarBriefingDoProjeto = salvarBriefing.bind(null, projeto.id);
  const criarContratoDoProjeto = criarContrato.bind(null, projeto.id);
  const aprovar = aprovarProjeto.bind(null, projeto.id);
  const excluir = excluirProjeto.bind(null, projeto.id, projeto.cliente_id);

  return (
    <>
      <PaginaHeader
        titulo={projeto.nome}
        descricao={projeto.clientes ? `${projeto.clientes.nome}${projeto.clientes.empresa ? ` · ${projeto.clientes.empresa}` : ""}` : undefined}
        acao={
          <div className="flex flex-wrap items-center gap-3">
            <StatusForm status={projeto.status} action={mudarStatus} />
            <Botao href={`/projetos/${projeto.id}/editar`} variante="secundario">
              Editar
            </Botao>
          </div>
        }
      />

      {atrasados.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[12px] bg-falha px-5 py-3 text-white">
          <p className="text-sm font-semibold">
            {atrasados.length} pagamento(s) atrasado(s) · {formatBRL(atrasados.reduce((s, p) => s + Number(p.valor), 0))}
          </p>
          <Link href={`/projetos/${projeto.id}?aba=pagamentos`} className="text-sm underline underline-offset-4">
            Ver parcelas
          </Link>
        </div>
      )}

      {sugerirAprovado && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-rosa-600 bg-rosa-900/40 px-5 py-3">
          <p className="text-sm text-rosa-100">
            Contrato assinado. Quer mudar o projeto pra <strong>Aprovado</strong>?
          </p>
          <form action={aprovar}>
            <Botao type="submit">Sim, aprovar projeto</Botao>
          </form>
        </div>
      )}

      <nav className="mb-6 flex gap-1 border-b border-borda">
        {abas.map((a) => (
          <Link
            key={a.id}
            href={`/projetos/${projeto.id}?aba=${a.id}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              aba === a.id
                ? "border-rosa-600 text-rosa-200"
                : "border-transparent text-texto-mudo hover:border-borda-forte hover:text-texto-suave",
            )}
          >
            {a.label}
            {a.id === "briefing" && briefing && <span className="ml-1.5 text-[#5fe07a]">•</span>}
            {a.id === "contrato" && temAssinado && <span className="ml-1.5 text-[#5fe07a]">•</span>}
          </Link>
        ))}
      </nav>

      {aba === "geral" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardTitulo>Detalhes</CardTitulo>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Item k="Cliente">
                  <Link href={`/clientes/${projeto.cliente_id}`} className="text-rosa-300 hover:underline">
                    {projeto.clientes?.nome ?? "—"}
                  </Link>
                </Item>
                <Item k="Tipo">{projeto.tipo ?? "—"}</Item>
                <Item k="Status">
                  <BadgeProjeto status={projeto.status} />
                </Item>
                <Item k="Valor total">{formatBRL(projeto.valor_total)}</Item>
                <Item k="Início">{formatDate(projeto.data_inicio)}</Item>
                <Item k="Prazo de entrega">{formatDate(projeto.prazo_entrega)}</Item>
                <Item k="Link">
                  {projeto.link_projeto ? (
                    <a href={projeto.link_projeto} target="_blank" rel="noreferrer" className="break-all text-rosa-300 hover:underline">
                      {projeto.link_projeto}
                    </a>
                  ) : (
                    "—"
                  )}
                </Item>
                <Item k="Criado em">{formatDate(projeto.criado_em)}</Item>
              </dl>
            </Card>

            <Card>
              <CardTitulo>Observações</CardTitulo>
              {projeto.observacoes ? (
                <p className="text-sm whitespace-pre-wrap text-texto-suave">{projeto.observacoes}</p>
              ) : (
                <p className="text-sm text-texto-mudo">Nada anotado ainda.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardTitulo>Financeiro</CardTitulo>
              <dl className="space-y-3 text-sm">
                <Item k="Recebido">
                  <span className="text-lg font-medium text-[#5fe07a]">{formatBRL(totalPago)}</span>
                </Item>
                <Item k="A receber">
                  <span className="text-lg font-medium">{formatBRL(totalPendente)}</span>
                </Item>
                {projeto.valor_total !== null && (
                  <Item k="Não parcelado">
                    <span className={cn(Number(projeto.valor_total) - totalPago - totalPendente !== 0 && "text-[#ffc266]")}>
                      {formatBRL(Number(projeto.valor_total) - totalPago - totalPendente)}
                    </span>
                  </Item>
                )}
              </dl>
              <Botao href={`/projetos/${projeto.id}?aba=pagamentos`} variante="terciario" className="mt-4">
                Gerenciar parcelas
              </Botao>
            </Card>

            <Card>
              <CardTitulo>Andamento</CardTitulo>
              <dl className="space-y-3 text-sm">
                <Item k="Briefing">
                  {briefing ? (
                    <span className="text-[#5fe07a]">Preenchido</span>
                  ) : (
                    <Link href={`/projetos/${projeto.id}?aba=briefing`} className="text-rosa-300 underline">
                      Preencher
                    </Link>
                  )}
                </Item>
                <Item k="Contrato">
                  {temAssinado ? (
                    <span className="text-[#5fe07a]">Assinado</span>
                  ) : listaContratos.some((c) => c.status === "enviado") ? (
                    <span className="text-[#ffc266]">Aguardando assinatura</span>
                  ) : listaContratos.length ? (
                    <span className="text-texto-mudo">Rascunho</span>
                  ) : (
                    <Link href={`/projetos/${projeto.id}?aba=contrato`} className="text-rosa-300 underline">
                      Criar
                    </Link>
                  )}
                </Item>
              </dl>
            </Card>

            <form action={excluir}>
              <Botao type="submit" variante="perigo" className="w-full">
                Excluir projeto
              </Botao>
              <p className="mt-2 text-xs text-texto-mudo">Exclui também briefing, contratos e pagamentos vinculados.</p>
            </form>
          </div>
        </div>
      )}

      {aba === "pagamentos" && (
        <div className="space-y-6">
          <ListaPagamentos pagamentos={lista} />
          <PagamentoForm projetoId={projeto.id} dataInicio={projeto.data_inicio} />
        </div>
      )}

      {aba === "briefing" && (
        <div className="max-w-3xl">
          <BriefingForm action={salvarBriefingDoProjeto} briefing={briefing ?? null} />
        </div>
      )}

      {aba === "contrato" && (
        <div className="max-w-3xl space-y-6">
          <ListaContratos contratos={listaContratos} />
          <NovoContratoForm action={criarContratoDoProjeto} />
        </div>
      )}
    </>
  );
}

function Item({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="rotulo">{k}</dt>
      <dd className="mt-0.5 text-texto-suave">{children}</dd>
    </div>
  );
}
