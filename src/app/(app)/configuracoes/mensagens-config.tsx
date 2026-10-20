"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Campo, Input, MensagemErro, Select, Textarea } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { CANAIS, SITUACOES, variaveisDa, type ModeloMensagem, type Situacao } from "@/lib/mensagem";
import {
  alternarModeloMensagem,
  criarModeloMensagem,
  excluirModeloMensagem,
  salvarModeloMensagem,
  type FormState,
} from "./actions";

/*
 * Aba Mensagens: a biblioteca de textos que a May dispara todo dia.
 * Mesmo esquema do corpo do contrato — {{variaveis}} resolvidas na hora de usar
 * (ver src/lib/mensagem.ts) —, mas aqui organizado por situação, porque é a
 * situação que decide em que tela o modelo aparece.
 */

export function MensagensConfig({ modelos, onSalvo }: { modelos: ModeloMensagem[]; onSalvo: (msg: string) => void }) {
  const [criando, setCriando] = useState<Situacao | null>(null);

  return (
    <div className="space-y-5 entrar">
      <div>
        <h2 className="text-lg font-semibold text-[#F5F5F4] mb-0.5">Mensagens</h2>
        <p className="text-xs text-[#968F88]">
          Os textos que você repete toda semana. Ficam a um clique na tela onde você está, já preenchidos com o nome,
          o valor e a data certos.
        </p>
      </div>

      {SITUACOES.map((s) => {
        const daSituacao = modelos.filter((m) => m.situacao === s.id);
        return (
          <Secao key={s.id} titulo={s.label} sub={s.descricao} contagem={daSituacao.length}>
            {daSituacao.length === 0 && (
              <p className="px-6 py-5 text-xs text-[#968F88]">Nenhum modelo nesta situação ainda.</p>
            )}
            {daSituacao.map((m) => (
              <ModeloEditor key={m.id} modelo={m} onSalvo={onSalvo} />
            ))}
            <div className="px-6 py-4 border-t border-[#311C45]">
              {criando === s.id ? (
                <NovoModelo situacao={s.id} onPronto={() => { setCriando(null); onSalvo("Modelo criado"); }} onCancelar={() => setCriando(null)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setCriando(s.id)}
                  className="px-3 py-1.5 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors"
                >
                  + Novo modelo de {s.label.toLowerCase()}
                </button>
              )}
            </div>
          </Secao>
        );
      })}
    </div>
  );
}

function ModeloEditor({ modelo, onSalvo }: { modelo: ModeloMensagem; onSalvo: (msg: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState(salvarModeloMensagem.bind(null, modelo.id), {} as FormState);
  const [pendente, iniciar] = useTransition();

  // Só avisa o pai (toast). O editor continua aberto depois de salvar, igual ao de contratos:
  // é comum querer ajustar duas vezes seguidas, e fechar sozinho atrapalha mais do que ajuda.
  useEffect(() => {
    if (estado.ok) onSalvo("Modelo salvo");
  }, [estado.ok, onSalvo]);

  return (
    <div className="border-b border-[#311C45] last:border-b-0">
      <div className="flex items-center gap-3 px-6 py-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex-1 flex items-center gap-2.5 text-left min-w-0"
        >
          <span className={cn("text-[#5A496A] transition-transform text-[10px]", aberto && "rotate-90")}>▶</span>
          <span className={cn("text-xs truncate", modelo.ativo ? "text-[#DDDBD9]" : "text-[#5A496A] line-through")}>
            {modelo.nome}
          </span>
          <span className="text-[10px] text-[#5A496A] shrink-0">
            {CANAIS.find((c) => c.id === modelo.canal)?.label}
          </span>
        </button>

        <button
          type="button"
          disabled={pendente}
          onClick={() => iniciar(async () => { await alternarModeloMensagem(modelo.id, !modelo.ativo); onSalvo(modelo.ativo ? "Modelo desativado" : "Modelo ativado"); })}
          className="text-[10px] text-[#968F88] hover:text-[#DDDBD9] transition-colors shrink-0"
          title={modelo.ativo ? "Desativar (some das telas, sem apagar)" : "Ativar"}
        >
          {modelo.ativo ? "ativo" : "inativo"}
        </button>

        <button
          type="button"
          disabled={pendente}
          onClick={() => confirm(`Excluir o modelo "${modelo.nome}"?`) && iniciar(async () => { await excluirModeloMensagem(modelo.id); onSalvo("Modelo excluído"); })}
          className="w-6 h-6 rounded flex items-center justify-center text-[#5A496A] hover:text-red-400 transition-colors shrink-0"
          title="Excluir"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {aberto && (
        <form action={acao} className="px-6 pb-5 space-y-3">
          <CamposModelo modelo={modelo} />
          <MensagemErro>{estado.erro}</MensagemErro>
          <div className="flex justify-end">
            <BotaoConfirmar disabled={enviando}>{enviando ? "Salvando…" : "Salvar modelo"}</BotaoConfirmar>
          </div>
        </form>
      )}
    </div>
  );
}

function NovoModelo({ situacao, onPronto, onCancelar }: { situacao: Situacao; onPronto: () => void; onCancelar: () => void }) {
  const [estado, acao, enviando] = useActionState(criarModeloMensagem, {} as FormState);

  useEffect(() => {
    if (estado.ok) onPronto();
  }, [estado.ok, onPronto]);

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="situacao" value={situacao} />
      <CamposModelo situacao={situacao} novo />
      <MensagemErro>{estado.erro}</MensagemErro>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="px-4 py-2 text-xs text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
          Cancelar
        </button>
        <BotaoConfirmar disabled={enviando}>{enviando ? "Criando…" : "Criar modelo"}</BotaoConfirmar>
      </div>
    </form>
  );
}

function CamposModelo({ modelo, situacao, novo = false }: { modelo?: ModeloMensagem; situacao?: Situacao; novo?: boolean }) {
  const [canal, setCanal] = useState(modelo?.canal ?? "whatsapp");
  const qual = modelo?.situacao ?? situacao ?? "outro";
  const variaveis = variaveisDa(qual);

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Nome do modelo" htmlFor={`nome-${modelo?.id ?? "novo"}`} hint="Só pra você achar na lista">
          <Input
            id={`nome-${modelo?.id ?? "novo"}`}
            name="nome"
            defaultValue={modelo?.nome ?? ""}
            placeholder="Ex.: Follow-up de proposta"
            required
          />
        </Campo>
        <Campo label="Canal" htmlFor={`canal-${modelo?.id ?? "novo"}`}>
          <Select
            id={`canal-${modelo?.id ?? "novo"}`}
            name="canal"
            value={canal}
            onChange={(e) => setCanal(e.target.value as typeof canal)}
          >
            {CANAIS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </Campo>
      </div>

      {!novo && (
        <input type="hidden" name="situacao" value={qual} />
      )}

      {canal !== "whatsapp" && (
        <Campo label="Assunto do e-mail" htmlFor={`assunto-${modelo?.id ?? "novo"}`}>
          <Input id={`assunto-${modelo?.id ?? "novo"}`} name="assunto" defaultValue={modelo?.assunto ?? ""} placeholder="Ex.: Sua proposta está pronta" />
        </Campo>
      )}
      {canal === "whatsapp" && <input type="hidden" name="assunto" value="" />}

      <Campo label="Texto" htmlFor={`corpo-${modelo?.id ?? "novo"}`}>
        <Textarea
          id={`corpo-${modelo?.id ?? "novo"}`}
          name="corpo"
          rows={10}
          defaultValue={modelo?.corpo ?? ""}
          placeholder="Oi, {{cliente_primeiro_nome}}! …"
          className="leading-relaxed"
          required
        />
      </Campo>

      <div className="rounded-lg border border-[#311C45] bg-[#1B0F27] px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-[#5A496A] mb-2">Variáveis disponíveis aqui</p>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
          {variaveis.map((v) => (
            <p key={v.chave} className="text-[10px] text-[#968F88] leading-relaxed">
              <code className="text-brand-400 font-mono">{`{{${v.chave}}}`}</code> — {v.descricao}
            </p>
          ))}
        </div>
        <p className="text-[10px] text-[#5A496A] mt-2 leading-relaxed">
          Variável sem valor no cadastro vira texto vazio, e a linha dela some da mensagem. Você revisa tudo antes de mandar.
        </p>
      </div>
    </>
  );
}

function Secao({ titulo, sub, contagem, children }: { titulo: string; sub?: string; contagem: number; children: React.ReactNode }) {
  return (
    <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#311C45] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F5F5F4]">{titulo}</p>
          {sub && <p className="text-xs text-[#968F88] mt-0.5 leading-relaxed">{sub}</p>}
        </div>
        <span className="text-[10px] text-[#5A496A] font-mono shrink-0">{contagem}</span>
      </div>
      {children}
    </div>
  );
}
