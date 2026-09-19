import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca } from "@/components/ui/primitivos";
import { createClient } from "@/lib/supabase/server";
import type { Pagamento } from "@/lib/types";
import { Financeiro, type PagamentoLinha, type ProjetoOpcao } from "./financeiro";

type PagamentoJoin = Pagamento & { projetos: { id: string; nome: string; data_inicio: string | null; clientes: { id: string; nome: string; empresa: string | null } | null } | null };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; novo?: string; projeto?: string }> }) {
  const { q = "", status = "", novo, projeto } = await searchParams;
  const supabase = await createClient();

  const [{ data: pagamentos }, { data: projetos }] = await Promise.all([
    supabase.from("pagamentos_view").select("*, projetos(id, nome, data_inicio, clientes(id, nome, empresa))").order("vencimento", { ascending: false }).returns<PagamentoJoin[]>(),
    supabase.from("projetos").select("id, nome, data_inicio, clientes(nome, empresa)").neq("status", "cancelado").order("criado_em", { ascending: false }),
  ]);

  const termo = q.trim().toLowerCase();
  const linhas: PagamentoLinha[] = (pagamentos ?? [])
    .map((p) => ({
      ...p,
      projetoNome: p.projetos?.nome ?? "—",
      clienteNome: p.projetos?.clientes?.empresa ?? p.projetos?.clientes?.nome ?? "—",
      clienteId: p.projetos?.clientes?.id ?? null,
    }))
    .filter((p) => !status || p.status === status)
    .filter((p) => !termo || p.projetoNome.toLowerCase().includes(termo) || p.clienteNome.toLowerCase().includes(termo));

  const opcoes: ProjetoOpcao[] = (projetos ?? []).map((p) => {
    const c = p.clientes as unknown as { nome: string; empresa: string | null } | null;
    return { id: p.id, label: `${c?.empresa ?? c?.nome ?? "—"} · ${p.nome}`, data_inicio: p.data_inicio };
  });

  return (
    <Financeiro
      linhas={linhas}
      todas={(pagamentos ?? []).map((p) => ({ valor: Number(p.valor), status: p.status }))}
      projetos={opcoes}
      abrirNovo={novo === "1"}
      projetoInicial={projeto}
      busca={<Busca placeholder="Buscar cliente ou projeto…" defaultValue={q} className="w-52" />}
      filtro={
        <FiltroMenu
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
