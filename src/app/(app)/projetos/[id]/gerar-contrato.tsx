"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BotaoCancelar, BotaoConfirmar, Escolha, Modal } from "@/components/ui/modal";
import { BotaoGhost, BotaoPrimario, Campo, Input, MensagemErro, Textarea } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { baixarBlob, gerarPdfContrato } from "@/lib/contrato-pdf";
import { fmt } from "@/lib/format";
import type { Contrato, ModeloContrato, Pagamento } from "@/lib/types";
import { gerarContrato, salvarDocumentoContrato, type FormState } from "../actions";

/*
 * Botão "Gerar contrato" (aba Contrato do projeto) + visualização do documento gerado.
 * O texto é montado no servidor a partir do modelo do tipo de serviço; aqui a May escolhe
 * as opções do contrato (hospedagem, textos, licenças, portfólio) e revisa antes de baixar.
 */

export function GerarContratoBotao({
  projetoId,
  modelo,
  pagamentos,
  valorProjeto,
  pagamentoPrevisto,
}: {
  projetoId: string;
  modelo: ModeloContrato | null;
  pagamentos: Pagamento[];
  valorProjeto: number | null;
  pagamentoPrevisto: string;
}) {
  const [aberto, setAberto] = useState(false);
  if (!modelo) {
    return (
      <p className="text-[11px] text-[#968F88]">
        Sem modelo de contrato pra este tipo de serviço. Cadastre em Configurações → Contratos.
      </p>
    );
  }
  return (
    <>
      <BotaoPrimario onClick={() => setAberto(true)} icone={false}>
        Gerar contrato
      </BotaoPrimario>
      {aberto && (
        <ModalGerar
          projetoId={projetoId}
          modelo={modelo}
          pagamentos={pagamentos}
          valorProjeto={valorProjeto}
          pagamentoPrevisto={pagamentoPrevisto}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}

function ModalGerar({
  projetoId,
  modelo,
  pagamentos,
  valorProjeto,
  pagamentoPrevisto,
  onClose,
}: {
  projetoId: string;
  modelo: ModeloContrato;
  pagamentos: Pagamento[];
  valorProjeto: number | null;
  pagamentoPrevisto: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(gerarContrato.bind(null, projetoId), {});
  const [hospedagem, setHospedagem] = useState<"contratante" | "contratada">("contratante");
  const [textos, setTextos] = useState<"cliente" | "contratada">("cliente");
  const [portfolio, setPortfolio] = useState(true);
  const [testemunhas, setTestemunhas] = useState(false);
  const [editarPagamento, setEditarPagamento] = useState(false);
  const [editarAnexo, setEditarAnexo] = useState(false);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal titulo={`Gerar contrato · ${modelo.titulo.replace("DESENVOLVIMENTO DE ", "")}`} onClose={onClose} largura="lg">
      <form action={action} className="space-y-4">
        <input type="hidden" name="hospedagem" value={hospedagem} />
        <input type="hidden" name="textos" value={textos} />
        <input type="hidden" name="portfolio" value={portfolio ? "on" : "false"} />
        <input type="hidden" name="testemunhas" value={testemunhas ? "on" : "false"} />

        <div className="rounded-lg border border-[#311C45] bg-[#1B0F26] px-3 py-2.5 text-[11px] text-[#968F88] space-y-1">
          <p>
            Valor do projeto: <span className="font-mono text-[#C5C2BE]">{valorProjeto !== null ? fmt(valorProjeto) : "não definido"}</span> · Prazo:{" "}
            <span className="text-[#C5C2BE]">{modelo.prazo_extenso}</span>
          </p>
          <p>Os dados do cliente (CPF/CNPJ, endereço, e-mail e telefone) vêm do cadastro. Se algum estiver vazio, sai como [A INFORMAR].</p>
        </div>

        <Campo label="Pagamento" htmlFor="pagamento_texto" hint={pagamentos.length ? `Montado a partir das ${pagamentos.length} parcela(s) cadastradas no projeto.` : "Nenhuma parcela cadastrada: escreva a condição abaixo."}>
          {editarPagamento || pagamentos.length === 0 ? (
            <Textarea id="pagamento_texto" name="pagamento_texto" rows={4} defaultValue={pagamentoPrevisto} />
          ) : (
            <div className="rounded-lg border border-[#311C45] bg-[#150C1D] px-3 py-2.5">
              <pre className="whitespace-pre-wrap text-[11px] text-[#C5C2BE] font-sans leading-relaxed">{pagamentoPrevisto}</pre>
              <button type="button" onClick={() => setEditarPagamento(true)} className="mt-2 text-[11px] text-brand-400 hover:text-brand-300">
                Editar texto do pagamento
              </button>
            </div>
          )}
        </Campo>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-1.5">Hospedagem</p>
          <Escolha
            colunas={2}
            valor={hospedagem}
            onChange={setHospedagem}
            opcoes={[
              { valor: "contratante", label: "Pelo cliente" },
              { valor: "contratada", label: "Por mim (VPS)" },
            ]}
          />
        </div>
        {hospedagem === "contratada" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="Mensalidade (R$)" htmlFor="hospedagem_valor">
              <Input id="hospedagem_valor" name="hospedagem_valor" inputMode="decimal" placeholder="90,00" />
            </Campo>
            <Campo label="Vence todo dia" htmlFor="hospedagem_dia">
              <Input id="hospedagem_dia" name="hospedagem_dia" inputMode="numeric" placeholder="10" maxLength={2} />
            </Campo>
            <Campo label="Backups" htmlFor="hospedagem_backup">
              <Input id="hospedagem_backup" name="hospedagem_backup" placeholder="semanais" />
            </Campo>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-1.5">Textos do site</p>
          <Escolha
            colunas={2}
            valor={textos}
            onChange={setTextos}
            opcoes={[
              { valor: "cliente", label: "Cliente fornece" },
              { valor: "contratada", label: "Copy por mim" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Licença inclusa (opcional)" htmlFor="licencas" hint="Vazio = nenhuma; todas por conta do cliente.">
            <Input id="licencas" name="licencas" placeholder="Elementor Pro" />
          </Campo>
          <Campo label="Período da licença" htmlFor="licencas_periodo">
            <Input id="licencas_periodo" name="licencas_periodo" placeholder="12 meses" />
          </Campo>
        </div>

        <Campo label="Representante do cliente (opcional)" htmlFor="representante" hint="Só para empresa: quem assina em nome dela.">
          <Input id="representante" name="representante" placeholder="Nome do representante" />
        </Campo>

        <div className="flex flex-wrap gap-4">
          <Marcador ativo={portfolio} onChange={setPortfolio} label="Autoriza uso no portfólio" />
          <Marcador ativo={testemunhas} onChange={setTestemunhas} label="Incluir testemunhas" />
        </div>

        <Campo label="Anexo I — escopo" htmlFor="anexo" hint="Vem do modelo do tipo de serviço. Ajuste os números e itens deste projeto.">
          {editarAnexo ? (
            <Textarea id="anexo" name="anexo" rows={14} defaultValue={modelo.anexo} className="font-mono text-[11px]" />
          ) : (
            <div className="rounded-lg border border-[#311C45] bg-[#150C1D] px-3 py-2.5 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-[11px] text-[#968F88] font-sans leading-relaxed">{modelo.anexo.replace(/^#+ /gm, "").slice(0, 600)}…</pre>
              <button type="button" onClick={() => setEditarAnexo(true)} className="mt-2 text-[11px] text-brand-400 hover:text-brand-300">
                Editar escopo deste contrato
              </button>
            </div>
          )}
        </Campo>

        <MensagemErro>{state.erro}</MensagemErro>
        <div className="flex items-center justify-end gap-2 pt-1">
          <BotaoCancelar onClick={onClose} />
          <BotaoConfirmar disabled={pending}>{pending ? "Gerando…" : "Gerar contrato"}</BotaoConfirmar>
        </div>
      </form>
    </Modal>
  );
}

function Marcador({ ativo, onChange, label }: { ativo: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!ativo)} className="flex items-center gap-2 text-xs text-[#C5C2BE]">
      <span className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", ativo ? "bg-brand-400 border-brand-400" : "border-[#5A496A]")}>
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

/* ---------- Documento gerado: ver, editar e baixar ---------- */

export function DocumentoContrato({ contrato, projetoId, clienteNome }: { contrato: Contrato; projetoId: string; clienteNome: string }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(contrato.documento ?? "");
  const [baixando, setBaixando] = useState(false);
  const [salvando, salvar] = useTransition();

  if (!contrato.documento) return null;
  const nomeArquivo = `Contrato ${contrato.numero ?? ""} - ${clienteNome}.pdf`.replace(/\s+/g, " ").trim();

  const baixar = async () => {
    setBaixando(true);
    try {
      const blob = await gerarPdfContrato(texto, nomeArquivo);
      baixarBlob(blob, nomeArquivo);
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="border-t border-[#311C45] pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88]">Documento gerado</p>
        <div className="flex items-center gap-2">
          {contrato.status === "rascunho" && (
            <BotaoGhost onClick={() => setEditando((v) => !v)}>{editando ? "Ver formatado" : "Editar texto"}</BotaoGhost>
          )}
          <BotaoGhost onClick={baixar} className={cn(baixando && "opacity-50")}>
            {baixando ? "Gerando PDF…" : "Baixar PDF"}
          </BotaoGhost>
        </div>
      </div>

      {editando ? (
        <form
          action={(fd) => salvar(async () => {
            await salvarDocumentoContrato(contrato.id, projetoId, fd);
            setEditando(false);
          })}
          className="space-y-2"
        >
          <Textarea name="documento" rows={20} value={texto} onChange={(e) => setTexto(e.target.value)} className="font-mono text-[11px]" />
          <div className="flex justify-end">
            <BotaoConfirmar disabled={salvando}>{salvando ? "Salvando…" : "Salvar texto"}</BotaoConfirmar>
          </div>
        </form>
      ) : (
        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[#311C45] bg-[#150C1D] px-4 py-3">
          <Previa texto={texto} />
        </div>
      )}
    </div>
  );
}

/** Prévia simples do markdown do contrato (mesmas convenções do PDF). */
function Previa({ texto }: { texto: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith("**") ? <strong key={i} className="text-[#DDDBD9]">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));

  return (
    <div className="space-y-1.5 text-[11px] leading-relaxed text-[#968F88]">
      {texto.split("\n").map((linha, i) => {
        if (!linha.trim()) return <div key={i} className="h-1" />;
        if (linha.startsWith("# ")) return <p key={i} className="text-center text-sm font-semibold text-[#F5F5F4] pt-2">{linha.slice(2)}</p>;
        if (linha.startsWith("## ")) return <p key={i} className="text-center text-xs font-semibold text-[#DDDBD9] pb-1">{linha.slice(3)}</p>;
        if (linha.startsWith("### ")) return <p key={i} className="text-[11px] font-semibold text-brand-400 pt-2">{linha.slice(4)}</p>;
        if (linha.startsWith("- ")) return <p key={i} className="pl-3">• {inline(linha.slice(2))}</p>;
        if (/^_{6,}$/.test(linha.trim())) return <div key={i} className="mt-4 mb-1 w-48 border-t border-[#5A496A]" />;
        return <p key={i}>{inline(linha)}</p>;
      })}
    </div>
  );
}
