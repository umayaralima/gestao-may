import Link from "next/link";
import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca, Header, KpiCard, Subbar, Vazio } from "@/components/ui/primitivos";
import { baseUrl } from "@/lib/enviar-resumo";
import { formatBRL, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Proposta } from "@/lib/types";
import { CartaoProposta } from "./proposta-ui";

type PropostaJoin = Proposta & {
  leads: { id: string; nome: string; empresa: string | null } | null;
  clientes: { id: string; nome: string; empresa: string | null } | null;
};

/** Todas as propostas num lugar só: o que está esperando resposta, o que venceu e o que fechou. */
export default async function PropostasPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("propostas").select("*, leads(id, nome, empresa), clientes(id, nome, empresa)").order("criado_em", { ascending: false }).returns<PropostaJoin[]>();

  const hoje = hojeISO();
  const comStatus = (data ?? []).map((p) => ({
    ...p,
    status: p.status === "enviada" && p.validade && p.validade < hoje ? ("expirada" as const) : p.status,
    dono: p.leads ? { tipo: "lead" as const, ...p.leads } : p.clientes ? { tipo: "cliente" as const, ...p.clientes } : null,
  }));

  const termo = q.trim().toLowerCase();
  const lista = comStatus
    .filter((p) => !status || p.status === status)
    .filter((p) => !termo || p.titulo.toLowerCase().includes(termo) || (p.dono?.empresa ?? p.dono?.nome ?? "").toLowerCase().includes(termo) || (p.numero ?? "").toLowerCase().includes(termo));

  const soma = (fn: (p: (typeof comStatus)[number]) => boolean) => comStatus.filter(fn).reduce((s, p) => s + Number(p.valor ?? 0), 0);
  const aguardando = comStatus.filter((p) => p.status === "enviada");
  const aceitas = comStatus.filter((p) => p.status === "aceita");
  const respondidas = comStatus.filter((p) => ["aceita", "recusada"].includes(p.status));
  const taxa = respondidas.length ? Math.round((aceitas.length / respondidas.length) * 100) : null;

  return (
    <>
      <Header titulo="Propostas" sub={`${comStatus.length} no total · ${aguardando.length} aguardando resposta`}>
        <Busca key="busca" placeholder="Buscar proposta, cliente ou número…" defaultValue={q} className="sm:w-64" />
      </Header>

      <Subbar key="subbar">
        <FiltroMenu
          param="status"
          rotulo="Situação"
          opcoes={[
            { valor: "", label: "Todas" },
            { valor: "rascunho", label: "Rascunho", cor: "#968F88" },
            { valor: "enviada", label: "Enviada", cor: "#FBBF24" },
            { valor: "aceita", label: "Aceita", cor: "#34D399" },
            { valor: "recusada", label: "Pediu ajuste", cor: "#F87171" },
            { valor: "expirada", label: "Vencida", cor: "#5A496A" },
          ]}
        />
        <span className="text-[11px] font-mono text-[#968F88]">{lista.length} proposta(s)</span>
      </Subbar>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 entrar">
          <KpiCard label="Aguardando" value={String(aguardando.length)} sub={formatBRL(soma((p) => p.status === "enviada"))} accent="text-amber-400" />
          <KpiCard label="Aceitas" value={String(aceitas.length)} sub={formatBRL(soma((p) => p.status === "aceita"))} accent="text-emerald-400" />
          <KpiCard label="Taxa de aceite" value={taxa !== null ? `${taxa}%` : "—"} sub={respondidas.length ? `${aceitas.length} de ${respondidas.length} respondidas` : "sem respostas ainda"} />
          <KpiCard label="Abertas pelo cliente" value={`${aguardando.filter((p) => p.vista_em).length}/${aguardando.length}`} sub="das que estão aguardando" />
        </div>

        {lista.length === 0 ? (
          <Vazio icone="📄" titulo="Nenhuma proposta aqui" sub="Crie a primeira na página de um negócio do Pipeline." />
        ) : (
          <div className="space-y-4 entrar entrar-1">
            {lista.map((p) => (
              <div key={p.id} className="space-y-1.5">
                {p.dono && (
                  <Link
                    href={p.dono.tipo === "lead" ? `/pipeline/${p.dono.id}` : `/clientes/${p.dono.id}`}
                    className="inline-block text-[11px] text-[#968F88] hover:text-brand-400 transition-colors"
                  >
                    {p.dono.empresa ?? p.dono.nome} ↗
                  </Link>
                )}
                <CartaoProposta p={p} baseUrlPublico={baseUrl()} compacto />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
