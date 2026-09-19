import Link from "next/link";
import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Avatar, BotaoLinha, Busca, Header, Pill, Subbar, Td, Th, Tr, Vazio } from "@/components/ui/primitivos";
import { STATUS_PROJETO, STATUS_PROJETO_ATIVO, STATUS_PROJETO_LABEL } from "@/lib/constantes";
import { diffDias, fmt, fmtData, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Projeto } from "@/lib/types";
import { NovoProjetoBotao } from "./novo-projeto-botao";
import { tomStatus } from "./status-tom";

type ProjetoJoin = Projeto & { clientes: { id: string; nome: string; empresa: string | null } | null };

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; novo?: string; cliente?: string; servico?: string; valor?: string }>;
}) {
  const { q = "", status = "", novo, cliente, servico, valor } = await searchParams;
  const supabase = await createClient();

  const [{ data: projetos }, { data: clientes }, { data: tipos }, { data: pagamentos }] = await Promise.all([
    supabase.from("projetos").select("*, clientes(id, nome, empresa)").order("criado_em", { ascending: false }).returns<ProjetoJoin[]>(),
    supabase.from("clientes").select("id, nome, empresa").order("nome"),
    supabase.from("tipos_projeto").select("nome").order("ordem").order("nome"),
    supabase.from("pagamentos_view").select("projeto_id, valor, status"),
  ]);

  const termo = q.trim().toLowerCase();
  const lista = (projetos ?? [])
    .filter((p) => (status === "ativos" ? (STATUS_PROJETO_ATIVO as string[]).includes(p.status) : !status || p.status === status))
    .filter((p) => !termo || [p.nome, p.tipo, p.clientes?.nome, p.clientes?.empresa].some((v) => v?.toLowerCase().includes(termo)));

  const recebido = (id: string) => (pagamentos ?? []).filter((x) => x.projeto_id === id && x.status === "pago").reduce((s, x) => s + Number(x.valor), 0);
  const emCarteira = lista.filter((p) => p.status !== "cancelado").reduce((s, p) => s + Number(p.valor_total ?? 0), 0);
  const hoje = hojeISO();

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Projetos"
        sub={
          <>
            {lista.length} projetos · <span className="font-mono">{fmt(emCarteira)}</span> em carteira
          </>
        }
      >
        <Busca placeholder="Buscar projeto ou cliente…" defaultValue={q} className="w-56" />
        <NovoProjetoBotao
          clientes={clientes ?? []}
          tipos={(tipos ?? []).map((t) => t.nome)}
          abrir={novo === "1"}
          inicial={{ cliente_id: cliente, tipo: servico || undefined, valor_total: valor ? Number(valor) : undefined }}
        />
      </Header>
      <Subbar>
        <FiltroMenu
          param="status"
          opcoes={[
            { valor: "", label: "Todos" },
            { valor: "ativos", label: "Ativos", cor: "#B159C7" },
            ...STATUS_PROJETO.map((s) => ({ valor: s, label: STATUS_PROJETO_LABEL[s] })),
          ]}
        />
        <span className="text-[11px] font-mono text-[#968F88]">{lista.length} registros</span>
      </Subbar>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#150C1D] z-10">
            <tr className="border-b border-[#311C45]">
              {["Projeto", "Cliente", "Tipo", "Status", "Valor", "Recebido", "Prazo", ""].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const rec = recebido(p.id);
              const pct = p.valor_total ? Math.min(100, (rec / Number(p.valor_total)) * 100) : 0;
              const atrasoPrazo = p.prazo_entrega && !["entregue", "concluido", "cancelado"].includes(p.status) && diffDias(hoje, p.prazo_entrega) < 0;
              return (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/projetos/${p.id}`} className="text-xs font-semibold text-[#DDDBD9] hover:text-brand-400">
                      {p.nome}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/clientes/${p.cliente_id}`} className="flex items-center gap-2">
                      <Avatar nome={p.clientes?.empresa ?? p.clientes?.nome ?? "?"} tamanho={7} />
                      <span className="text-xs text-[#C5C2BE]">{p.clientes?.empresa ?? p.clientes?.nome ?? "—"}</span>
                    </Link>
                  </Td>
                  <Td>{p.tipo ?? "—"}</Td>
                  <Td>
                    <Pill tom={tomStatus(p.status)}>{STATUS_PROJETO_LABEL[p.status]}</Pill>
                  </Td>
                  <Td className="font-mono text-[#DDDBD9]">{fmt(p.valor_total)}</Td>
                  <Td className="w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-[#311C45] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-[#968F88] w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </Td>
                  <Td className={atrasoPrazo ? "font-mono text-red-400" : "font-mono text-[#968F88]"}>{fmtData(p.prazo_entrega)}</Td>
                  <Td>
                    <BotaoLinha href={`/projetos/${p.id}`}>Abrir</BotaoLinha>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && (
          <Vazio icone="📁" titulo="Nenhum projeto nesse filtro" sub={(clientes ?? []).length === 0 ? "Projeto sem cliente não existe: cadastre um cliente primeiro." : undefined} />
        )}
      </div>
    </div>
  );
}
