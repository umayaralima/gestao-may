import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca, Subbar } from "@/components/ui/primitivos";
import { fmt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Contrato, Interacao, Projeto } from "@/lib/types";
import { ClientesTabela, type ClienteLinha } from "./clientes-tabela";

type ContratoComProjeto = Contrato & { projetos: { cliente_id: string; nome: string } | null };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; novo?: string }> }) {
  const { q = "", status = "", novo } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientes }, { data: projetos }, { data: interacoes }, { data: contratos }] = await Promise.all([
    supabase.from("clientes").select("*").order("criado_em", { ascending: false }).returns<Cliente[]>(),
    supabase.from("projetos").select("*").order("criado_em", { ascending: false }).returns<Projeto[]>(),
    supabase.from("interacoes").select("*").not("cliente_id", "is", null).order("data", { ascending: false }).order("criado_em", { ascending: false }).returns<Interacao[]>(),
    supabase.from("contratos").select("*, projetos(cliente_id, nome)").order("criado_em", { ascending: false }).returns<ContratoComProjeto[]>(),
  ]);

  const termo = q.trim().toLowerCase();
  const linhas: ClienteLinha[] = (clientes ?? [])
    .filter((c) => !status || c.status === status)
    .filter((c) => !termo || [c.nome, c.empresa, c.email, c.nicho].some((v) => v?.toLowerCase().includes(termo)))
    .map((c) => {
      const ps = (projetos ?? []).filter((p) => p.cliente_id === c.id);
      const ativos = ps.filter((p) => p.status !== "cancelado");
      const its = (interacoes ?? []).filter((i) => i.cliente_id === c.id);
      return {
        cliente: c,
        valor: ativos.reduce((s, p) => s + Number(p.valor_total ?? 0), 0),
        negocios: ativos.length,
        ultimoContato: its[0]?.data ?? null,
        projetos: ps,
        interacoes: its,
        contratos: (contratos ?? []).filter((k) => k.projetos?.cliente_id === c.id).map((k) => ({ ...k, projeto_nome: k.projetos?.nome ?? "" })),
      };
    });

  const totalCarteira = linhas.reduce((s, l) => s + l.valor, 0);
  const ativos = linhas.filter((l) => l.cliente.status === "ativo").length;

  return (
    <ClientesTabela
      linhas={linhas}
      abrirNovo={novo === "1"}
      sub={
        <>
          {linhas.length} registros · {ativos} ativos · <span className="font-mono">{fmt(totalCarteira)}</span> em carteira
        </>
      }
      busca={<Busca placeholder="Buscar cliente, contato ou e-mail…" defaultValue={q} className="w-64" />}
      subbar={
        <Subbar>
          <FiltroMenu
            param="status"
            opcoes={[
              { valor: "", label: "Todos" },
              { valor: "ativo", label: "Ativo", cor: "#34D399" },
              { valor: "inativo", label: "Inativo", cor: "#968F88" },
            ]}
          />
          <span className="text-[11px] font-mono text-[#968F88]">{linhas.length} registros</span>
        </Subbar>
      }
    />
  );
}
