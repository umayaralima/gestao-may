"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { BotaoCancelar, BotaoConfirmar, Escolha, Modal } from "@/components/ui/modal";
import { BotaoGhost, BotaoPrimario, Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { baixarBlob, gerarPdfContrato } from "@/lib/contrato-pdf";
import { formatBRL, formatDate, fmtRelativo } from "@/lib/format";
import { CONDICOES } from "@/lib/proposta";
import type { Proposta } from "@/lib/types";
import { criarProposta, enviarProposta, escopoSugerido, excluirProposta, responderProposta, salvarDocumentoProposta, type FormState } from "./actions";

/* ---------- Botão + modal de criação (usado na página do lead) ---------- */

export function NovaPropostaBotao({
  dono,
  tipos,
  sugestao,
  validadePadrao,
}: {
  dono: { lead?: string; cliente?: string };
  tipos: Array<{ nome: string; prazo: string | null }>;
  sugestao: { titulo: string; valor: number | null; tipo: string | null };
  validadePadrao: number;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <BotaoPrimario onClick={() => setAberto(true)}>Nova proposta</BotaoPrimario>
      {aberto && <ModalProposta dono={dono} tipos={tipos} sugestao={sugestao} validadePadrao={validadePadrao} onClose={() => setAberto(false)} />}
    </>
  );
}

function ModalProposta({
  dono,
  tipos,
  sugestao,
  validadePadrao,
  onClose,
}: {
  dono: { lead?: string; cliente?: string };
  tipos: Array<{ nome: string; prazo: string | null }>;
  sugestao: { titulo: string; valor: number | null; tipo: string | null };
  validadePadrao: number;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(criarProposta.bind(null, dono), {});
  const inicial = sugestao.tipo && tipos.some((t) => t.nome === sugestao.tipo) ? sugestao.tipo : (tipos[0]?.nome ?? "");
  const [tipo, setTipo] = useState(inicial);
  const [condicao, setCondicao] = useState<string>("50_50");
  const [escopo, setEscopo] = useState<string | null>(null);
  const [editarEscopo, setEditarEscopo] = useState(false);
  const [carregando, carregar] = useTransition();

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  // busca o escopo do tipo escolhido (vem do Anexo I do modelo de contrato)
  useEffect(() => {
    if (!tipo) return;
    carregar(async () => setEscopo(await escopoSugerido(tipo)));
  }, [tipo]);

  const prazoDoTipo = tipos.find((t) => t.nome === tipo)?.prazo ?? "";

  return (
    <Modal titulo="Nova proposta" onClose={onClose} largura="lg">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Tipo de serviço" htmlFor="tipo_projeto">
            <Select id="tipo_projeto" name="tipo_projeto" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {tipos.map((t) => (
                <option key={t.nome} value={t.nome}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Título da proposta" htmlFor="titulo">
            <Input id="titulo" name="titulo" required defaultValue={sugestao.titulo} placeholder="Site institucional — Clínica X" />
          </Campo>
          <Campo label="Valor (R$)" htmlFor="valor">
            <Input id="valor" name="valor" required inputMode="decimal" defaultValue={sugestao.valor ? String(sugestao.valor).replace(".", ",") : ""} placeholder="4.800,00" />
          </Campo>
          <Campo label="Prazo" htmlFor="prazo_extenso" hint="Vem do tipo de serviço; ajuste se precisar.">
            <Input id="prazo_extenso" name="prazo_extenso" required defaultValue={prazoDoTipo} key={prazoDoTipo} placeholder="15 (quinze) dias úteis" />
          </Campo>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-1.5">Condição de pagamento</p>
          <input type="hidden" name="condicao" value={condicao} />
          <Escolha colunas={3} valor={condicao} onChange={setCondicao} opcoes={CONDICOES.map((c) => ({ valor: c.id, label: c.label }))} />
        </div>

        <Campo label="Validade (dias)" htmlFor="validade_dias" hint="Depois disso a proposta aparece como vencida pro cliente.">
          <Input id="validade_dias" name="validade_dias" type="number" min={1} max={90} defaultValue={validadePadrao} className="sm:w-28" />
        </Campo>

        <Campo label="O que você recebe" htmlFor="escopo" hint="Vem do escopo do tipo de serviço (o mesmo que vai pro contrato).">
          {editarEscopo ? (
            <Textarea id="escopo" name="escopo" rows={12} defaultValue={escopo ?? ""} className="font-mono text-[11px]" />
          ) : (
            <div className="rounded-lg border border-[#311C45] bg-[#150C1D] px-3 py-2.5 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-[11px] text-[#968F88] font-sans leading-relaxed">{carregando ? "Carregando…" : (escopo ?? "").replace(/^#+ /gm, "").slice(0, 600)}</pre>
              <button type="button" onClick={() => setEditarEscopo(true)} className="mt-2 text-[11px] text-brand-400 hover:text-brand-300">
                Editar escopo desta proposta
              </button>
            </div>
          )}
        </Campo>

        <Campo label="Observações (opcional)" htmlFor="observacoes" hint="Entra no fim da proposta. Ex.: condições especiais, bônus combinado.">
          <Textarea id="observacoes" name="observacoes" rows={2} />
        </Campo>

        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Gerando…" : "Gerar proposta"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Cartão da proposta (lead, cliente e lista) ---------- */

const TOM: Record<Proposta["status"], { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-white/5 border-[#5A496A] text-[#968F88]" },
  enviada: { rotulo: "Enviada", classe: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  aceita: { rotulo: "Aceita", classe: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  recusada: { rotulo: "Pediu ajuste", classe: "bg-red-500/10 border-red-500/20 text-red-400" },
  expirada: { rotulo: "Vencida", classe: "bg-white/5 border-[#5A496A] text-[#968F88]" },
};

export function CartaoProposta({ p, baseUrlPublico, compacto }: { p: Proposta; baseUrlPublico: string; compacto?: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.documento ?? "");
  const [baixando, setBaixando] = useState(false);

  const link = `${baseUrlPublico}/p/${p.token}`;
  const tom = TOM[p.status];
  const nomeArquivo = `Proposta ${p.numero ?? ""} - ${p.titulo}.pdf`.replace(/\s+/g, " ").trim();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="bg-[#231431] border border-[#311C45] rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", tom.classe)}>{tom.rotulo}</span>
            {p.numero && <span className="text-[11px] font-mono text-[#968F88]">{p.numero}</span>}
          </div>
          <p className="text-sm font-semibold text-[#DDDBD9] mt-1.5 truncate">{p.titulo}</p>
          <p className="text-[11px] text-[#968F88] mt-0.5">
            <span className="font-mono text-[#C5C2BE]">{formatBRL(p.valor)}</span>
            {p.prazo_extenso && ` · ${p.prazo_extenso}`}
            {p.validade && ` · vale até ${formatDate(p.validade)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={link} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 text-[11px] text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors">
            Ver como cliente ↗
          </a>
          <button type="button" onClick={copiar} className="px-2.5 py-1.5 text-[11px] text-[#968F88] border border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9] rounded-lg transition-colors">
            {copiado ? "Copiado ✓" : "Copiar link"}
          </button>
          <button
            type="button"
            onClick={async () => {
              setBaixando(true);
              try {
                baixarBlob(await gerarPdfContrato(texto, nomeArquivo), nomeArquivo);
              } finally {
                setBaixando(false);
              }
            }}
            className="px-2.5 py-1.5 text-[11px] text-[#968F88] border border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9] rounded-lg transition-colors"
          >
            {baixando ? "Gerando…" : "PDF"}
          </button>
        </div>
      </div>

      {/* Situação do acompanhamento */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#968F88]">
        {p.enviada_em && <span>Enviada {fmtRelativo(p.enviada_em)}</span>}
        {p.vista_em ? <span className="text-brand-400">Aberta pelo cliente {fmtRelativo(p.vista_em)}</span> : p.enviada_em && <span>Ainda não aberta</span>}
        {p.respondida_em && <span className={p.status === "aceita" ? "text-emerald-400" : "text-amber-400"}>Respondida {fmtRelativo(p.respondida_em)}</span>}
      </div>

      {p.resposta_cliente && (
        <div className="rounded-lg border border-[#311C45] bg-[#1B0F26] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-1">O cliente escreveu</p>
          <p className="text-xs text-[#C5C2BE] leading-relaxed">{p.resposta_cliente}</p>
        </div>
      )}

      {!compacto && (
        <>
          {editando ? (
            <form action={(fd) => iniciar(async () => { await salvarDocumentoProposta(p.id, fd); setEditando(false); })} className="space-y-2">
              <Textarea name="documento" rows={16} value={texto} onChange={(e) => setTexto(e.target.value)} className="font-mono text-[11px]" />
              <div className="flex justify-end gap-2">
                <BotaoGhost onClick={() => setEditando(false)}>Cancelar</BotaoGhost>
                <BotaoConfirmar disabled={pendente}>Salvar texto</BotaoConfirmar>
              </div>
            </form>
          ) : (
            <details className="rounded-lg border border-[#311C45] bg-[#150C1D]">
              <summary className="px-3 py-2 text-[11px] text-brand-400 cursor-pointer">Ver o texto da proposta</summary>
              <div className="px-4 py-3 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-[11px] text-[#968F88] font-sans leading-relaxed">{texto.replace(/^#+ /gm, "")}</pre>
              </div>
            </details>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#311C45] pt-4">
        {p.status === "rascunho" && (
          <>
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => setErro((await enviarProposta(p.id, true)).erro ?? null))}
              className="px-3 py-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {pendente ? "Enviando…" : "Enviar por e-mail"}
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => setErro((await enviarProposta(p.id, false)).erro ?? null))}
              className="px-3 py-2 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors"
            >
              Marcar como enviada
            </button>
            {!editando && <BotaoGhost onClick={() => setEditando(true)}>Editar texto</BotaoGhost>}
          </>
        )}
        {p.status === "enviada" && (
          <>
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => setErro((await responderProposta(p.id, "aceita")).erro ?? null))}
              className="px-3 py-2 text-xs text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-colors"
            >
              Marcar aceita
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => setErro((await responderProposta(p.id, "recusada")).erro ?? null))}
              className="px-3 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors"
            >
              Marcar recusada
            </button>
          </>
        )}
        {p.status === "aceita" && p.lead_id && (
          <Link href={`/pipeline/${p.lead_id}`} className="px-3 py-2 bg-brand-400 hover:bg-brand-300 text-white text-xs font-semibold rounded-lg transition-colors">
            Converter em cliente →
          </Link>
        )}
        {erro && <span className="text-[11px] text-red-400">{erro}</span>}
        <button
          type="button"
          onClick={() => confirm("Excluir esta proposta?") && iniciar(() => excluirProposta(p.id, p.lead_id))}
          className="ml-auto text-[11px] text-[#968F88] hover:text-red-400 transition-colors"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
