import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectInline } from "@/components/ui/select-inline";
import { Avatar, BotaoGhost, BotaoLinha, BotaoPrimario, Card, CardTitulo, Header, KpiCard, Pill, Td, Th, Tr } from "@/components/ui/primitivos";
import { ORIGEM_CLIENTE_LABEL, STATUS_PROJETO_LABEL } from "@/lib/constantes";
import { fmt, fmtData } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Interacao, Pagamento, Projeto } from "@/lib/types";
import { adiarFollowup, concluirFollowup, excluirInteracao, registrarInteracao, salvarFollowup, type Dono } from "../../crm/actions";
import { PainelRelacionamento } from "../../crm/painel-relacionamento";
import { excluirCliente, mudarStatusCliente } from "../actions";
import { EditarClienteBotao } from "./editar-botao";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: projetos }, { data: interacoes }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single<Cliente>(),
    supabase.from("projetos").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).returns<Projeto[]>(),
    supabase.from("interacoes").select("*").eq("cliente_id", id).order("data", { ascending: false }).order("criado_em", { ascending: false }).returns<Interacao[]>(),
  ]);
  if (!cliente) notFound();

  const ids = (projetos ?? []).map((p) => p.id);
  const { data: pagamentos } = ids.length
    ? await supabase.from("pagamentos_view").select("*").in("projeto_id", ids).returns<Pagamento[]>()
    : { data: [] as Pagamento[] };

  const ativos = (projetos ?? []).filter((p) => p.status !== "cancelado");
  const valorTotal = ativos.reduce((s, p) => s + Number(p.valor_total ?? 0), 0);
  const recebido = (pagamentos ?? []).filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const atrasado = (pagamentos ?? []).filter((p) => p.status === "atrasado").reduce((s, p) => s + Number(p.valor), 0);

  const dono: Dono = { tipo: "cliente", id: cliente.id };
  const acoes = {
    registrarInteracao: registrarInteracao.bind(null, dono),
    excluirInteracao: excluirInteracao.bind(null, dono),
    salvarFollowup: salvarFollowup.bind(null, dono),
    concluirFollowup: concluirFollowup.bind(null, dono),
    adiarFollowup: adiarFollowup.bind(null, dono),
  };
  const excluir = excluirCliente.bind(null, cliente.id);
  const mudarStatus = mudarStatusCliente.bind(null, cliente.id);

  return (
    <>
      <Header
        titulo={cliente.empresa ?? cliente.nome}
        sub={
          <>
            <Link href="/clientes" className="hover:text-[#DDDBD9]">
              Clientes
            </Link>{" "}
            › {cliente.empresa ? cliente.nome : cliente.nicho ?? "cliente"}
            {cliente.lead_id && (
              <>
                {" "}
                ·{" "}
                <Link href={`/pipeline/${cliente.lead_id}`} className="text-brand-400 hover:text-brand-300">
                  veio do pipeline
                </Link>
              </>
            )}
          </>
        }
      >
        <SelectInline
          name="status"
          label="Status"
          value={cliente.status}
          opcoes={[
            { valor: "ativo", label: "Ativo" },
            { valor: "inativo", label: "Inativo" },
          ]}
          action={mudarStatus}
        />
        <EditarClienteBotao cliente={cliente} />
        <BotaoPrimario href={`/projetos?novo=1&cliente=${cliente.id}`}>Novo projeto</BotaoPrimario>
      </Header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="grid grid-cols-4 gap-4 entrar">
          <KpiCard label="Valor total" value={fmt(valorTotal)} sub={`${ativos.length} projeto(s)`} />
          <KpiCard label="Recebido" value={fmt(recebido)} accent="text-emerald-400" sub={`${(pagamentos ?? []).filter((p) => p.status === "pago").length} pagamento(s)`} />
          <KpiCard label="Em atraso" value={fmt(atrasado)} accent={atrasado > 0 ? "text-red-400" : undefined} sub={atrasado > 0 ? "cobrar" : "nada em atraso"} />
          <KpiCard label="Interações" value={String((interacoes ?? []).length)} sub={interacoes?.[0] ? `última ${fmtData(interacoes[0].data)}` : "nenhuma ainda"} />
        </div>

        <div className="grid grid-cols-3 gap-4 entrar entrar-1">
          <Card className="col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar nome={cliente.empresa ?? cliente.nome} tamanho={11} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F5F4] truncate">{cliente.nome}</p>
                <p className="text-[11px] text-[#968F88] truncate">{cliente.nicho ?? "Nicho não informado"}</p>
              </div>
            </div>
            <dl className="space-y-2.5 text-xs">
              <Linha k="WhatsApp">
                {cliente.whatsapp ? (
                  <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-mono text-brand-400 hover:text-brand-300">
                    {cliente.whatsapp}
                  </a>
                ) : (
                  "—"
                )}
              </Linha>
              <Linha k="E-mail">
                {cliente.email ? (
                  <a href={`mailto:${cliente.email}`} className="font-mono text-brand-400 hover:text-brand-300">
                    {cliente.email}
                  </a>
                ) : (
                  "—"
                )}
              </Linha>
              <Linha k="Origem">{cliente.origem ? ORIGEM_CLIENTE_LABEL[cliente.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? cliente.origem : "—"}</Linha>
              <Linha k="Cliente desde">{fmtData(cliente.criado_em)}</Linha>
            </dl>
            {cliente.observacoes && (
              <div className="border-t border-[#311C45] pt-3">
                <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-1.5">Observações</p>
                <p className="text-[11px] text-[#C5C2BE] leading-relaxed whitespace-pre-wrap">{cliente.observacoes}</p>
              </div>
            )}
            <form action={excluir} className="border-t border-[#311C45] pt-3">
              <button type="submit" className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors">
                Excluir cliente (apaga projetos e pagamentos)
              </button>
            </form>
          </Card>

          <div className="col-span-2 bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#311C45]">
              <CardTitulo sub={`${(projetos ?? []).length} no total`}>Projetos</CardTitulo>
              <BotaoGhost href={`/projetos?novo=1&cliente=${cliente.id}`}>+ Projeto</BotaoGhost>
            </div>
            {(projetos ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-[#968F88]">Nenhum projeto ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#311C45]">
                    <Th>Projeto</Th>
                    <Th>Tipo</Th>
                    <Th>Status</Th>
                    <Th>Valor</Th>
                    <Th>Prazo</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {(projetos ?? []).map((p) => (
                    <Tr key={p.id}>
                      <Td className="font-medium text-[#DDDBD9]">{p.nome}</Td>
                      <Td>{p.tipo ?? "—"}</Td>
                      <Td>
                        <Pill tom={p.status === "concluido" ? "success" : p.status === "cancelado" ? "muted" : p.status === "em_revisao" || p.status === "entregue" ? "warning" : "brand"}>
                          {STATUS_PROJETO_LABEL[p.status]}
                        </Pill>
                      </Td>
                      <Td className="font-mono text-[#DDDBD9]">{fmt(p.valor_total)}</Td>
                      <Td className="font-mono text-[#968F88]">{fmtData(p.prazo_entrega)}</Td>
                      <Td>
                        <BotaoLinha href={`/projetos/${p.id}`}>Abrir</BotaoLinha>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="entrar entrar-2">
          <PainelRelacionamento dono={dono} followup={{ data: cliente.proximo_followup, nota: cliente.nota_followup }} interacoes={interacoes ?? []} acoes={acoes} />
        </div>
      </div>
    </>
  );
}

function Linha({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#968F88]">{k}</dt>
      <dd className="text-[#DDDBD9] truncate">{children}</dd>
    </div>
  );
}
