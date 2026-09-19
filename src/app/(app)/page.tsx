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

  const mesAno = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  const subtitulo = `${mesAno.charAt(0).toUpperCase()}${mesAno.slice(1)} · Atualizado agora`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl text-texto sm:text-3xl">Dashboard</h1>
          <p className="mt-0.5 text-xs text-texto-mudo">{subtitulo}</p>
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
          <Link href="/pagamentos" className="text-sm text-rosa-300 underline underline-offset-4">
            Ver todos
          </Link>
        </div>
        {!proximos.data?.length ? (
          <Vazio>Nenhum vencimento futuro em aberto.</Vazio>
        ) : (
          <Tabela className="border-0 bg-transparent">
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
                    <Link href={`/projetos/${p.projeto_id}?aba=pagamentos`} className="font-medium text-rosa-300 hover:underline">
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
        "flex h-full flex-col rounded-[12px] border p-5 transition-colors",
        alerta ? "border-falha/60 bg-falha/15" : "border-borda bg-superficie",
        href && (alerta ? "hover:bg-falha/25" : "hover:border-borda-forte"),
      )}
    >
      <p className={cn("rotulo", alerta && "text-[#ff8a8a]")}>{titulo}</p>
      <p className={cn("mt-3 font-mono text-2xl font-semibold tracking-tight", alerta ? "text-[#ff8a8a]" : "text-texto")}>{valor}</p>
      {rodape && <p className={cn("mt-auto pt-2 text-xs", alerta ? "text-[#ff8a8a]/80" : "text-texto-mudo")}>{rodape}</p>}
    </div>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}
