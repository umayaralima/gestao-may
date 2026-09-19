import Link from "next/link";
import { BadgePagamento } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Card, CardTitulo } from "@/components/ui/card";
import { Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { cn } from "@/lib/cn";
import { STATUS_PROJETO_ATIVO } from "@/lib/constantes";
import { formatBRL, formatDate, hojeISO, primeiroEUltimoDiaDoMes } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Pagamento } from "@/lib/types";

type Proximo = Pagamento & { projetos: { id: string; nome: string; clientes: { nome: string } | null } | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { inicio, fim } = primeiroEUltimoDiaDoMes();
  const hoje = hojeISO();

  const [ativos, noMes, atrasados, contratos, proximos, followLeads, followClientes] = await Promise.all([
    supabase.from("projetos").select("id", { count: "exact", head: true }).in("status", STATUS_PROJETO_ATIVO),
    supabase.from("pagamentos_view").select("valor").neq("status", "pago").gte("vencimento", inicio).lte("vencimento", fim),
    supabase.from("pagamentos_view").select("valor").eq("status", "atrasado"),
    supabase.from("contratos").select("id", { count: "exact", head: true }).eq("status", "enviado"),
    supabase
      .from("pagamentos_view")
      .select("*, projetos(id, nome, clientes(nome))")
      .neq("status", "pago")
      .gte("vencimento", hoje)
      .order("vencimento")
      .limit(5)
      .returns<Proximo[]>(),
    supabase.from("leads").select("id", { count: "exact", head: true }).lte("proximo_followup", hoje).in("etapa", ["novo", "em_contato", "proposta_enviada", "negociando"]),
    supabase.from("clientes").select("id", { count: "exact", head: true }).lte("proximo_followup", hoje),
  ]);
  const qtdFollowups = (followLeads.count ?? 0) + (followClientes.count ?? 0);

  const soma = (rows: Array<{ valor: number }> | null) => (rows ?? []).reduce((s, r) => s + Number(r.valor), 0);
  const qtdAtrasados = atrasados.data?.length ?? 0;

  const saudacao = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  })();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutro-500">{saudacao}, May.</p>
          <h1 className="text-3xl text-neutro-900 sm:text-4xl">Como estão as coisas</h1>
        </div>
        <div className="flex gap-2">
          <Botao href="/leads/novo" variante="secundario">
            Novo lead
          </Botao>
          <Botao href="/projetos/novo">Novo projeto</Botao>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Resumo
          titulo="Follow-ups"
          valor={String(qtdFollowups)}
          href="/leads?ver=lista&filtro=followup"
          rodape={qtdFollowups ? "pra hoje ou atrasados" : "nada pendente"}
          alerta={qtdFollowups > 0}
        />
        <Resumo titulo="Projetos ativos" valor={String(ativos.count ?? 0)} href="/projetos?status=ativos" rodape="orçamento enviado até em revisão" />
        <Resumo titulo="A receber no mês" valor={formatBRL(soma(noMes.data))} href="/pagamentos" rodape={`${noMes.data?.length ?? 0} parcela(s)`} />
        <Resumo
          titulo="Atrasados"
          valor={formatBRL(soma(atrasados.data))}
          href="/pagamentos?status=atrasado"
          rodape={`${qtdAtrasados} parcela(s)`}
          alerta={qtdAtrasados > 0}
        />
        <Resumo titulo="Contratos aguardando" valor={String(contratos.count ?? 0)} rodape="assinatura pendente · fase 2" />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitulo>Próximos vencimentos</CardTitulo>
          <Link href="/pagamentos" className="text-sm text-rosa-700 underline underline-offset-4">
            Ver todos
          </Link>
        </div>
        {!proximos.data?.length ? (
          <Vazio>Nenhum vencimento futuro em aberto.</Vazio>
        ) : (
          <Tabela className="shadow-none">
            <Thead>
              <tr>
                <Th>Projeto</Th>
                <Th>Cliente</Th>
                <Th className="text-right">Valor</Th>
                <Th>Vencimento</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <tbody>
              {proximos.data.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/projetos/${p.projeto_id}?aba=pagamentos`} className="font-medium text-rosa-700 hover:underline">
                      {p.projetos?.nome ?? "—"}
                    </Link>
                  </Td>
                  <Td>{p.projetos?.clientes?.nome ?? "—"}</Td>
                  <Td className="text-right font-medium">{formatBRL(p.valor)}</Td>
                  <Td>{formatDate(p.vencimento)}</Td>
                  <Td>
                    <BadgePagamento status={p.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Card>
    </>
  );
}

function Resumo({
  titulo,
  valor,
  rodape,
  href,
  alerta,
}: {
  titulo: string;
  valor: string;
  rodape?: string;
  href?: string;
  alerta?: boolean;
}) {
  const conteudo = (
    <div
      className={cn(
        "flex h-full flex-col rounded-medium p-5 shadow-padrao transition-transform",
        alerta ? "bg-falha text-white" : "bg-branco text-neutro-900",
        href && "hover:-translate-y-0.5",
      )}
    >
      <p className={cn("text-xs uppercase tracking-wide", alerta ? "text-white/80" : "text-neutro-500")}>{titulo}</p>
      <p className="titulo mt-2 text-3xl">{valor}</p>
      {rodape && <p className={cn("mt-auto pt-3 text-xs", alerta ? "text-white/80" : "text-neutro-500")}>{rodape}</p>}
    </div>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}
