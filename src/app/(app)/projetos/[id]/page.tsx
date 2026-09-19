import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeProjeto } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Card, CardTitulo } from "@/components/ui/card";
import { PaginaHeader } from "@/components/ui/pagina";
import { cn } from "@/lib/cn";
import { TIPO_PROJETO_LABEL } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Pagamento, Projeto } from "@/lib/types";
import { ListaPagamentos } from "../../pagamentos/lista-pagamentos";
import { PagamentoForm } from "../../pagamentos/pagamento-form";
import { excluirProjeto, mudarStatusProjeto } from "../actions";
import { StatusForm } from "./status-form";

type ProjetoComCliente = Projeto & { clientes: { id: string; nome: string; empresa: string | null } | null };

const abas = [
  { id: "geral", label: "Visão geral" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "briefing", label: "Briefing", fase2: true },
  { id: "contrato", label: "Contrato", fase2: true },
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
  const [{ data: projeto }, { data: pagamentos }] = await Promise.all([
    supabase.from("projetos").select("*, clientes(id, nome, empresa)").eq("id", id).single<ProjetoComCliente>(),
    supabase.from("pagamentos_view").select("*").eq("projeto_id", id).order("vencimento").returns<Pagamento[]>(),
  ]);
  if (!projeto) notFound();

  const lista = pagamentos ?? [];
  const totalPago = lista.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const totalPendente = lista.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.valor), 0);
  const atrasados = lista.filter((p) => p.status === "atrasado");

  const mudarStatus = mudarStatusProjeto.bind(null, projeto.id);
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
        <div className="mb-6 flex items-center justify-between gap-4 rounded-medium bg-falha px-5 py-3 text-white">
          <p className="text-sm font-semibold">
            {atrasados.length} pagamento(s) atrasado(s) · {formatBRL(atrasados.reduce((s, p) => s + Number(p.valor), 0))}
          </p>
          <Link href={`/projetos/${projeto.id}?aba=pagamentos`} className="text-sm underline underline-offset-4">
            Ver parcelas
          </Link>
        </div>
      )}

      <nav className="mb-6 flex gap-1 border-b border-neutro-100">
        {abas.map((a) => (
          <Link
            key={a.id}
            href={`/projetos/${projeto.id}?aba=${a.id}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              aba === a.id
                ? "border-rosa-600 text-rosa-800"
                : "border-transparent text-neutro-500 hover:border-neutro-200 hover:text-neutro-800",
            )}
          >
            {a.label}
            {"fase2" in a && a.fase2 && <span className="ml-1.5 text-[10px] uppercase text-neutro-400">em breve</span>}
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
                  <Link href={`/clientes/${projeto.cliente_id}`} className="text-rosa-700 hover:underline">
                    {projeto.clientes?.nome ?? "—"}
                  </Link>
                </Item>
                <Item k="Tipo">{projeto.tipo ? TIPO_PROJETO_LABEL[projeto.tipo] : "—"}</Item>
                <Item k="Status">
                  <BadgeProjeto status={projeto.status} />
                </Item>
                <Item k="Valor total">{formatBRL(projeto.valor_total)}</Item>
                <Item k="Início">{formatDate(projeto.data_inicio)}</Item>
                <Item k="Prazo de entrega">{formatDate(projeto.prazo_entrega)}</Item>
                <Item k="Link">
                  {projeto.link_projeto ? (
                    <a href={projeto.link_projeto} target="_blank" rel="noreferrer" className="break-all text-rosa-700 hover:underline">
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
              <CardTitulo>Observações / briefing</CardTitulo>
              {projeto.observacoes ? (
                <p className="text-sm whitespace-pre-wrap text-neutro-800">{projeto.observacoes}</p>
              ) : (
                <p className="text-sm text-neutro-500">Nada anotado ainda.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardTitulo>Financeiro</CardTitulo>
              <dl className="space-y-3 text-sm">
                <Item k="Recebido">
                  <span className="text-lg font-medium text-sucesso">{formatBRL(totalPago)}</span>
                </Item>
                <Item k="A receber">
                  <span className="text-lg font-medium">{formatBRL(totalPendente)}</span>
                </Item>
                {projeto.valor_total !== null && (
                  <Item k="Não parcelado">
                    <span className={cn(Number(projeto.valor_total) - totalPago - totalPendente !== 0 && "text-alerta")}>
                      {formatBRL(Number(projeto.valor_total) - totalPago - totalPendente)}
                    </span>
                  </Item>
                )}
              </dl>
              <Botao href={`/projetos/${projeto.id}?aba=pagamentos`} variante="terciario" className="mt-4">
                Gerenciar parcelas
              </Botao>
            </Card>

            <form action={excluir}>
              <Botao type="submit" variante="perigo" className="w-full">
                Excluir projeto
              </Botao>
              <p className="mt-2 text-xs text-neutro-500">Exclui também os pagamentos vinculados.</p>
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

      {(aba === "briefing" || aba === "contrato") && (
        <Card>
          <p className="text-sm text-neutro-500">
            {aba === "briefing" ? "Briefing estruturado" : "Contratos"} entram na Fase 2. Por enquanto, use o campo de
            observações na aba Visão geral.
          </p>
        </Card>
      )}
    </>
  );
}

function Item({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutro-500">{k}</dt>
      <dd className="mt-0.5 text-neutro-800">{children}</dd>
    </div>
  );
}
