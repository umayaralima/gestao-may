import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca } from "@/components/ui/primitivos";
import { getConfiguracoes } from "@/lib/configuracoes";
import { modelosDaSituacao } from "@/lib/modelos-mensagem";
import { hojeISO, mesCurto } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaDespesa, Despesa, Pagamento } from "@/lib/types";
import type { DespesaLinha, ProjetoOpcaoDespesa } from "./despesas";
import { Financeiro, type PagamentoLinha, type ProjetoOpcao } from "./financeiro";
import type { MesResumo } from "./resumo";

type PagamentoJoin = Pagamento & { projetos: { id: string; nome: string; data_inicio: string | null; clientes: { id: string; nome: string; empresa: string | null; whatsapp: string | null; email: string | null } | null } | null };
type DespesaJoin = Despesa & { projetos: { nome: string; clientes: { nome: string; empresa: string | null } | null } | null };

const ABAS = ["entradas", "saidas", "resumo"] as const;
const MESES_RESUMO = 6;

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; novo?: string; projeto?: string; aba?: string; nova?: string }>;
}) {
  const { q = "", status = "", novo, projeto, aba: abaParam, nova } = await searchParams;
  const aba = (ABAS as readonly string[]).includes(abaParam ?? "") ? (abaParam as (typeof ABAS)[number]) : "entradas";
  const supabase = await createClient();

  const [{ data: pagamentos }, { data: projetos }, config, { data: despesas }, { data: categoriasDespesa }] = await Promise.all([
    supabase.from("pagamentos_view").select("*, projetos(id, nome, data_inicio, clientes(id, nome, empresa, whatsapp, email))").order("vencimento", { ascending: false }).returns<PagamentoJoin[]>(),
    supabase.from("projetos").select("id, nome, data_inicio, clientes(nome, empresa)").neq("status", "cancelado").order("criado_em", { ascending: false }),
    getConfiguracoes(),
    supabase.from("despesas").select("*, projetos(nome, clientes(nome, empresa))").order("data", { ascending: false }).returns<DespesaJoin[]>(),
    supabase.from("categorias_despesa").select("*").order("ordem").order("nome").returns<CategoriaDespesa[]>(),
  ]);

  const modelosCobranca = await modelosDaSituacao("cobranca");

  const termo = q.trim().toLowerCase();
  const linhas: PagamentoLinha[] = (pagamentos ?? [])
    .map((p) => ({
      ...p,
      projetoNome: p.projetos?.nome ?? "—",
      clienteNome: p.projetos?.clientes?.empresa ?? p.projetos?.clientes?.nome ?? "—",
      clienteId: p.projetos?.clientes?.id ?? null,
      clienteWhatsapp: p.projetos?.clientes?.whatsapp ?? null,
      clienteEmail: p.projetos?.clientes?.email ?? null,
    }))
    .filter((p) => !status || p.status === status)
    .filter((p) => !termo || p.projetoNome.toLowerCase().includes(termo) || p.clienteNome.toLowerCase().includes(termo));

  const opcoes: ProjetoOpcao[] = (projetos ?? []).map((p) => {
    const c = p.clientes as unknown as { nome: string; empresa: string | null } | null;
    return { id: p.id, label: `${c?.empresa ?? c?.nome ?? "—"} · ${p.nome}`, data_inicio: p.data_inicio };
  });
  const opcoesDespesa: ProjetoOpcaoDespesa[] = opcoes.map(({ id, label }) => ({ id, label }));

  const listaDespesas: DespesaLinha[] = (despesas ?? []).map((d) => {
    const c = d.projetos?.clientes;
    return { ...d, valor: Number(d.valor), projetoNome: d.projetos ? `${c?.empresa ?? c?.nome ?? ""} · ${d.projetos.nome}`.replace(/^ · /, "") : null };
  });

  /* Resumo: últimos meses com recebido (data de pagamento) × pago (data da despesa quitada). */
  const hoje = hojeISO();
  const [ano, mes] = hoje.split("-").map(Number);
  const resumoMeses: MesResumo[] = [];
  for (let i = MESES_RESUMO - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const receita = (pagamentos ?? [])
      .filter((p) => p.status === "pago" && p.data_pagamento?.startsWith(chave))
      .reduce((s, p) => s + Number(p.valor), 0);
    const despesa = (despesas ?? [])
      .filter((x) => (x.pago_em ?? x.data).startsWith(chave))
      .reduce((s, x) => s + Number(x.valor), 0);
    resumoMeses.push({ mes: chave, rotulo: `${mesCurto(`${chave}-01`)}/${String(d.getFullYear()).slice(2)}`, receita, despesa, lucro: receita - despesa });
  }

  return (
    <Financeiro
      linhas={linhas}
      todas={(pagamentos ?? []).map((p) => ({ valor: Number(p.valor), status: p.status }))}
      projetos={opcoes}
      abrirNovo={novo === "1"}
      projetoInicial={projeto}
      formaPreferida={config.forma_pagamento_preferida}
      diasAviso={config.dias_aviso_vencimento}
      temHandle={!!config.infinitepay_handle}
      config={config}
      modelosCobranca={modelosCobranca}
      aba={aba}
      despesas={listaDespesas}
      categoriasDespesa={categoriasDespesa ?? []}
      projetosDespesa={opcoesDespesa}
      resumoMeses={resumoMeses}
      abrirNovaDespesa={nova === "1"}
      busca={<Busca key="busca" placeholder="Buscar cliente ou projeto…" defaultValue={q} className="sm:w-52" />}
      filtro={
        <FiltroMenu
          key="filtro"
          param="status"
          opcoes={[
            { valor: "", label: "Todos" },
            { valor: "pendente", label: "Pendente", cor: "#FBBF24" },
            { valor: "atrasado", label: "Vencido", cor: "#F87171" },
            { valor: "pago", label: "Pago", cor: "#34D399" },
          ]}
        />
      }
    />
  );
}
