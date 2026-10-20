"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BotaoCancelar, BotaoConfirmar, Modal } from "@/components/ui/modal";
import { BotaoPrimario, Campo, Input, MensagemErro, Pill, Select, Td, Textarea, Th, Tr, Vazio } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { FORMA_PAGAMENTO_LABEL, FORMAS_PAGAMENTO, PERIODICIDADE_LABEL, PERIODICIDADES } from "@/lib/constantes";
import { diffDias, formatBRL, formatDate, hojeISO } from "@/lib/format";
import type { CategoriaDespesa, Despesa } from "@/lib/types";
import { alternarPagamentoDespesa, atualizarDespesa, criarDespesa, excluirDespesa, type FormState } from "./despesas-actions";

export type DespesaLinha = Despesa & { projetoNome: string | null };
export type ProjetoOpcaoDespesa = { id: string; label: string };

/** Aba Saídas do Financeiro: lançamentos de despesa, com recorrência e vínculo opcional a projeto. */
export function Despesas({
  despesas,
  categorias,
  projetos,
  abrirNova,
}: {
  despesas: DespesaLinha[];
  categorias: CategoriaDespesa[];
  projetos: ProjetoOpcaoDespesa[];
  abrirNova?: boolean;
}) {
  const [nova, setNova] = useState(!!abrirNova);
  const [editando, setEditando] = useState<DespesaLinha | null>(null);
  const icones = Object.fromEntries(categorias.map((c) => [c.nome, c.icone]));

  return (
    <>
      {nova && <DespesaModal categorias={categorias} projetos={projetos} onClose={() => setNova(false)} />}
      {editando && <DespesaModal categorias={categorias} projetos={projetos} despesa={editando} onClose={() => setEditando(null)} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88]">{despesas.length} lançamento(s)</p>
        <BotaoPrimario onClick={() => setNova(true)}>Nova despesa</BotaoPrimario>
      </div>

      {despesas.length === 0 ? (
        <Vazio icone="🧾" titulo="Nenhuma despesa lançada" sub="Hospedagem, licenças, ferramentas, anúncios — tudo que sai entra aqui." />
      ) : (
        <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-[#150C1D] z-10">
                <tr className="border-b border-[#311C45]">
                  {["Descrição", "Categoria", "Projeto", "Data", "Valor", "Situação", ""].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <LinhaDespesa key={d.id} d={d} icone={icones[d.categoria] ?? "•"} onEditar={() => setEditando(d)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function LinhaDespesa({ d, icone, onEditar }: { d: DespesaLinha; icone: string; onEditar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const pago = !!d.pago_em;
  const dias = pago ? null : diffDias(hojeISO(), d.data);
  const vencida = dias !== null && dias < 0;

  return (
    <Tr className={cn(pendente && "opacity-40")}>
      <Td>
        <button type="button" onClick={onEditar} className="text-left">
          <span className="text-xs font-medium text-[#DDDBD9] hover:text-brand-400 transition-colors">{d.descricao}</span>
          {d.fornecedor && <span className="block text-[10px] text-[#968F88]">{d.fornecedor}</span>}
        </button>
      </Td>
      <Td>
        <span className="text-[11px] text-[#C5C2BE] whitespace-nowrap">
          {icone} {d.categoria}
        </span>
        {d.recorrente && d.periodicidade && <span className="block text-[10px] text-brand-400">↻ {PERIODICIDADE_LABEL[d.periodicidade]}</span>}
      </Td>
      <Td className="text-[11px] text-[#968F88] max-w-[160px] truncate">{d.projetoNome ?? "—"}</Td>
      <Td className={cn("font-mono text-[11px]", vencida ? "text-red-400" : "text-[#968F88]")}>{formatDate(d.data)}</Td>
      <Td className="font-mono text-sm font-semibold text-[#DDDBD9]">{formatBRL(d.valor)}</Td>
      <Td>
        {pago ? (
          <Pill tom="success">Pago {formatDate(d.pago_em)}</Pill>
        ) : vencida ? (
          <Pill tom="error">Vencida</Pill>
        ) : (
          <Pill tom="warning">A pagar</Pill>
        )}
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => iniciar(() => alternarPagamentoDespesa(d.id, !pago))}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-lg border transition-colors whitespace-nowrap",
              pago ? "text-[#968F88] border-[#311C45] hover:border-[#5A496A]" : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10",
            )}
          >
            {pago ? "Desfazer" : "Marcar pago"}
          </button>
          <button
            type="button"
            onClick={() => confirm("Excluir esta despesa?") && iniciar(() => excluirDespesa(d.id))}
            className="w-6 h-6 rounded flex items-center justify-center text-[#5A496A] hover:text-red-400 transition-colors"
            title="Excluir"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </Td>
    </Tr>
  );
}

function DespesaModal({
  categorias,
  projetos,
  despesa,
  onClose,
}: {
  categorias: CategoriaDespesa[];
  projetos: ProjetoOpcaoDespesa[];
  despesa?: DespesaLinha;
  onClose: () => void;
}) {
  const acao = despesa ? atualizarDespesa.bind(null, despesa.id) : criarDespesa;
  const [state, action, pending] = useActionState<FormState, FormData>(acao, {});
  const [recorrente, setRecorrente] = useState(despesa?.recorrente ?? false);
  const [pago, setPago] = useState(!!despesa?.pago_em);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal titulo={despesa ? "Editar despesa" : "Nova despesa"} onClose={onClose} largura="lg">
      <form action={action} className="space-y-4">
        <input type="hidden" name="recorrente" value={recorrente ? "on" : "false"} />
        <input type="hidden" name="pago" value={pago ? "on" : "false"} />

        <Campo label="Descrição" htmlFor="descricao">
          <Input id="descricao" name="descricao" required autoFocus defaultValue={despesa?.descricao} placeholder="Hospedagem VPS — Hostinger" />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Campo label="Valor (R$)" htmlFor="valor">
            <Input id="valor" name="valor" required inputMode="decimal" defaultValue={despesa ? String(despesa.valor).replace(".", ",") : ""} placeholder="49,90" />
          </Campo>
          <Campo label="Data" htmlFor="data">
            <Input id="data" name="data" type="date" required defaultValue={despesa?.data ?? hojeISO()} />
          </Campo>
          <Campo label="Categoria" htmlFor="categoria">
            <Select id="categoria" name="categoria" defaultValue={despesa?.categoria ?? categorias[0]?.nome ?? "Outros"}>
              {categorias.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Fornecedor (opcional)" htmlFor="fornecedor">
            <Input id="fornecedor" name="fornecedor" defaultValue={despesa?.fornecedor ?? ""} placeholder="Hostinger, Adobe, Elementor…" />
          </Campo>
          <Campo label="Forma de pagamento" htmlFor="forma_pagamento">
            <Select id="forma_pagamento" name="forma_pagamento" defaultValue={despesa?.forma_pagamento ?? ""}>
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {FORMA_PAGAMENTO_LABEL[f]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>

        <Campo label="Custo de um projeto? (opcional)" htmlFor="projeto_id" hint="Se marcar, entra na margem daquele projeto.">
          <Select id="projeto_id" name="projeto_id" defaultValue={despesa?.projeto_id ?? ""}>
            <option value="">Despesa do negócio (não é de projeto)</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Campo>

        <div className="rounded-lg border border-[#311C45] bg-[#1B0F26] px-4 py-3 space-y-3">
          <Marcador ativo={recorrente} onChange={setRecorrente} label="É uma despesa que se repete" />
          {recorrente && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Com que frequência" htmlFor="periodicidade">
                <Select id="periodicidade" name="periodicidade" defaultValue={despesa?.periodicidade ?? "mensal"}>
                  {PERIODICIDADES.map((p) => (
                    <option key={p} value={p}>
                      {PERIODICIDADE_LABEL[p]}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo label="Até quando (opcional)" htmlFor="recorrencia_ate" hint="Vazio = sem data pra terminar.">
                <Input id="recorrencia_ate" name="recorrencia_ate" type="date" defaultValue={despesa?.recorrencia_ate ?? ""} />
              </Campo>
            </div>
          )}
          <p className="text-[11px] text-[#5A496A]">O sistema lança a próxima sozinho quando a data chegar.</p>
        </div>

        <Marcador ativo={pago} onChange={setPago} label="Já está paga" />

        <Campo label="Observações (opcional)" htmlFor="observacoes">
          <Textarea id="observacoes" name="observacoes" rows={2} defaultValue={despesa?.observacoes ?? ""} />
        </Campo>

        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Salvando…" : despesa ? "Salvar" : "Lançar despesa"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}

function Marcador({ ativo, onChange, label }: { ativo: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!ativo)} className="flex items-center gap-2 text-xs text-[#C5C2BE]">
      <span className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0", ativo ? "bg-brand-400 border-brand-400" : "border-[#5A496A]")}>
        {ativo && (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 4.5l2.5 2.5 4-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}
