"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { BotaoCancelar, BotaoConfirmar, Escolha, Modal } from "@/components/ui/modal";
import { Avatar, BotaoPrimario, Campo, Header, Input, KpiCard, MensagemErro, Pill, Select, Subbar, Th, Vazio } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { FORMA_PAGAMENTO_LABEL, FORMAS_PAGAMENTO, TIPO_PAGAMENTO, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { fmt, fmtData, hojeISO, mesAnoExtenso } from "@/lib/format";
import type { Pagamento } from "@/lib/types";
import { criarPagamento, desfazerPagamento, excluirPagamento, marcarComoPago, type FormState } from "./actions";

export type PagamentoLinha = Pagamento & { projetoNome: string; clienteNome: string; clienteId: string | null };
export type ProjetoOpcao = { id: string; label: string; data_inicio: string | null };

type Props = {
  linhas: PagamentoLinha[];
  todas: Array<{ valor: number; status: Pagamento["status"] }>;
  projetos: ProjetoOpcao[];
  abrirNovo?: boolean;
  projetoInicial?: string;
  busca: React.ReactNode;
  filtro: React.ReactNode;
};

const ICONE_FORMA: Record<string, string> = { pix: "⚡", transferencia: "🏦", boleto: "📄", cartao: "💳", outro: "💰" };

/** Tela Financeiro do protótipo: KPIs, barra tricolor, filtro hambúrguer, tabela, modal "Marcar pago". */
export function Financeiro({ linhas, todas, projetos, abrirNovo, projetoInicial, busca, filtro }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [novo, setNovo] = useState(!!abrirNovo);
  const [pagando, setPagando] = useState<PagamentoLinha | null>(null);

  const fecharNovo = useCallback(() => {
    setNovo(false);
    if (abrirNovo) router.replace(pathname);
  }, [abrirNovo, router, pathname]);

  const soma = (s: Pagamento["status"]) => todas.filter((p) => p.status === s).reduce((a, p) => a + p.valor, 0);
  const totalPago = soma("pago");
  const totalPendente = soma("pendente");
  const totalVencido = soma("atrasado");
  const total = totalPago + totalPendente + totalVencido;
  const qtd = (s: Pagamento["status"]) => todas.filter((p) => p.status === s).length;

  return (
    <>
      {novo && <NovoLancamentoModal projetos={projetos} projetoInicial={projetoInicial} onClose={fecharNovo} />}
      {pagando && <MarcarPagoModal pagamento={pagando} onClose={() => setPagando(null)} />}

      <div className="flex flex-col h-full">
        <Header titulo="Financeiro" sub={`Controle de pagamentos · ${mesAnoExtenso()}`}>
          {busca}
          <BotaoPrimario onClick={() => setNovo(true)}>Novo lançamento</BotaoPrimario>
        </Header>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 px-4 md:px-6 py-5 shrink-0 entrar">
          <KpiCard label="Total em carteira" value={fmt(total)} sub={`${todas.length} lançamentos`} />
          <KpiCard label="Recebido" value={fmt(totalPago)} sub={`${qtd("pago")} pagamentos`} accent="text-emerald-400" />
          <KpiCard label="A receber" value={fmt(totalPendente)} sub={`${qtd("pendente")} pendentes`} accent="text-amber-400" />
          <KpiCard label="Vencido" value={fmt(totalVencido)} sub={`${qtd("atrasado")} em atraso`} accent="text-red-400" />
        </div>

        {total > 0 && (
          <div className="px-4 md:px-6 pb-4 shrink-0 entrar entrar-1">
            <div className="flex rounded-full overflow-hidden h-2 bg-[#311C45]">
              <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(totalPago / total) * 100}%` }} />
              <div className="bg-amber-500 transition-all duration-700" style={{ width: `${(totalPendente / total) * 100}%` }} />
              <div className="bg-red-500 transition-all duration-700" style={{ width: `${(totalVencido / total) * 100}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {(
                [
                  ["Pago", "bg-emerald-500", totalPago],
                  ["Pendente", "bg-amber-500", totalPendente],
                  ["Vencido", "bg-red-500", totalVencido],
                ] as const
              ).map(([label, cor, val]) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] text-[#968F88]">
                  <span className={cn("w-2 h-2 rounded-full", cor)} /> {label} <span className="font-mono text-[#C5C2BE]">{fmt(val)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <Subbar className="border-t">
          {filtro}
          <span className="text-[11px] font-mono text-[#968F88]">{linhas.length} registros</span>
        </Subbar>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-[#150C1D] z-10">
              <tr className="border-b border-[#311C45]">
                {["Cliente", "Projeto", "Tipo", "Vencimento", "Pagamento", "Valor", "Status", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <LinhaPagamento key={p.id} p={p} onPagar={() => setPagando(p)} />
              ))}
            </tbody>
          </table>
          {linhas.length === 0 && <Vazio icone="💰" titulo="Nenhum lançamento encontrado" sub="Tente ajustar os filtros ou a busca" />}
        </div>
      </div>
    </>
  );
}

function LinhaPagamento({ p, onPagar }: { p: PagamentoLinha; onPagar: () => void }) {
  const [pending, startTransition] = useTransition();
  const vencido = p.status === "atrasado";
  const pago = p.status === "pago";
  return (
    <tr className={cn("border-b border-[#311C45]/50 hover:bg-white/[0.02] transition-colors", pending && "opacity-40")}>
      <td className="px-5 py-3.5">
        <Link href={p.clienteId ? `/clientes/${p.clienteId}` : "#"} className="flex items-center gap-2.5">
          <Avatar nome={p.clienteNome} tamanho={7} />
          <span className="text-xs font-medium text-[#DDDBD9]">{p.clienteNome}</span>
        </Link>
      </td>
      <td className="px-5 py-3.5 text-xs text-[#968F88] max-w-[200px] truncate">
        <Link href={`/projetos/${p.projeto_id}?aba=pagamentos`} className="hover:text-[#DDDBD9]">
          {p.projetoNome}
        </Link>
      </td>
      <td className="px-5 py-3.5 text-[11px] font-mono text-[#968F88]">{p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : "—"}</td>
      <td className="px-5 py-3.5">
        <span className={cn("text-[11px] font-mono", vencido ? "text-red-400" : "text-[#968F88]")}>{fmtData(p.vencimento)}</span>
      </td>
      <td className="px-5 py-3.5">
        {p.data_pagamento ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#968F88]">{fmtData(p.data_pagamento)}</span>
            {p.forma_pagamento && (
              <span className="text-[10px] text-[#968F88]">
                {ICONE_FORMA[p.forma_pagamento] ?? ""} {FORMA_PAGAMENTO_LABEL[p.forma_pagamento as keyof typeof FORMA_PAGAMENTO_LABEL] ?? p.forma_pagamento}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#5A496A]">—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className={cn("text-sm font-semibold font-mono", pago ? "text-emerald-400" : vencido ? "text-red-400" : "text-[#DDDBD9]")}>{fmt(p.valor)}</span>
      </td>
      <td className="px-5 py-3.5">
        {pago ? <Pill tom="success">Pago</Pill> : vencido ? <Pill tom="error">Vencido</Pill> : <Pill tom="warning">Pendente</Pill>}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {pago ? (
            <button
              type="button"
              onClick={() => startTransition(() => desfazerPagamento(p.id, p.projeto_id))}
              className="px-2.5 py-1 text-[11px] text-[#968F88] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors whitespace-nowrap"
            >
              Desfazer
            </button>
          ) : (
            <button
              type="button"
              onClick={onPagar}
              className="px-2.5 py-1 text-[11px] text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Marcar pago
            </button>
          )}
          <button
            type="button"
            onClick={() => confirm("Excluir este lançamento?") && startTransition(() => excluirPagamento(p.id, p.projeto_id))}
            className="w-6 h-6 rounded flex items-center justify-center text-[#5A496A] hover:text-red-400 transition-colors"
            title="Excluir"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function MarcarPagoModal({ pagamento, onClose }: { pagamento: PagamentoLinha; onClose: () => void }) {
  const [forma, setForma] = useState<string>(pagamento.forma_pagamento ?? "pix");
  const [pending, startTransition] = useTransition();
  return (
    <Modal titulo="Confirmar pagamento" onClose={onClose} largura="sm">
      <div className="bg-[#1B0F26] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#DDDBD9]">{pagamento.clienteNome}</p>
        <p className="text-[11px] text-[#968F88] mt-0.5">
          {pagamento.projetoNome}
          {pagamento.tipo && ` · ${TIPO_PAGAMENTO_LABEL[pagamento.tipo]}`}
        </p>
        <p className="text-lg font-semibold font-mono text-emerald-400 mt-2">{fmt(pagamento.valor)}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] block mb-2">Forma de pagamento</p>
        <Escolha opcoes={FORMAS_PAGAMENTO.map((f) => ({ valor: f, label: `${ICONE_FORMA[f]} ${FORMA_PAGAMENTO_LABEL[f]}` }))} valor={forma} onChange={setForma} colunas={3} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await marcarComoPago(pagamento.id, pagamento.projeto_id, forma);
              onClose();
            })
          }
          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {pending ? "Confirmando…" : "Confirmar recebimento"}
        </button>
      </div>
    </Modal>
  );
}

function NovoLancamentoModal({ projetos, projetoInicial, onClose }: { projetos: ProjetoOpcao[]; projetoInicial?: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(criarPagamento, {});
  const [projetoId, setProjetoId] = useState(projetoInicial ?? projetos[0]?.id ?? "");
  const dataInicio = projetos.find((p) => p.id === projetoId)?.data_inicio ?? undefined;

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal titulo="Novo lançamento" onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <Campo label="Projeto" htmlFor="projeto_id">
          <Select id="projeto_id" name="projeto_id" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} required>
            {projetos.length === 0 && <option value="">Nenhum projeto ativo</option>}
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Campo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Tipo" htmlFor="tipo">
            <Select id="tipo" name="tipo" defaultValue="parcela">
              {TIPO_PAGAMENTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_PAGAMENTO_LABEL[t]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Valor (R$)" htmlFor="valor">
            <Input id="valor" name="valor" type="number" step="0.01" min="0.01" required autoFocus />
          </Campo>
          <Campo label="Vencimento" htmlFor="vencimento" hint={dataInicio ? `Projeto começou em ${fmtData(dataInicio)}` : undefined}>
            <Input id="vencimento" name="vencimento" type="date" required min={dataInicio} defaultValue={hojeISO()} />
          </Campo>
          <Campo label="Forma prevista" htmlFor="forma_pagamento">
            <Select id="forma_pagamento" name="forma_pagamento" defaultValue="">
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {FORMA_PAGAMENTO_LABEL[f]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending || !projetoId}>{pending ? "Salvando…" : "Criar lançamento"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}
