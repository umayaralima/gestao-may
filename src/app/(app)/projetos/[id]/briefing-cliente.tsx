"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Card, Pill } from "@/components/ui/primitivos";
import { fmtData } from "@/lib/format";
import {
  perguntasVisiveis,
  porSecao,
  progresso,
  rotuloResposta,
  type PerguntaBriefing,
  type Respostas,
  type StatusBriefing,
} from "@/lib/briefing";
import { ajustarRespostaBriefing, liberarBriefing, reabrirBriefing, trocarTokenBriefing } from "../actions";

/*
 * Aba Briefing do projeto, lado da May. Substitui o formulário antigo de 9 campos:
 * quem responde agora é o cliente, pelo link. Aqui ela libera o link, acompanha o
 * preenchimento e lê — podendo completar na mão o que ouvir por WhatsApp.
 *
 * O que ela mais precisa enxergar é onde o cliente travou. Por isso "não sei
 * responder" aparece destacado, e não como um campo vazio qualquer.
 */
export function BriefingCliente({
  projetoId,
  tipoProjeto,
  perguntas,
  briefing,
  linkBase,
}: {
  projetoId: string;
  tipoProjeto: string | null;
  perguntas: PerguntaBriefing[];
  briefing: {
    token: string;
    status: StatusBriefing;
    respostas: Respostas;
    enviado_em: string | null;
    vista_em: string | null;
    respondido_em: string | null;
  } | null;
  linkBase: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // useMemo pra não gerar um objeto novo a cada render e invalidar os memos abaixo
  const respostas = useMemo(() => briefing?.respostas ?? {}, [briefing?.respostas]);
  const visiveis = useMemo(() => perguntasVisiveis(perguntas, tipoProjeto, respostas), [perguntas, tipoProjeto, respostas]);
  const grupos = useMemo(() => porSecao(visiveis), [visiveis]);
  const p = useMemo(() => progresso(visiveis, respostas), [visiveis, respostas]);

  const link = briefing ? `${linkBase}/b/${briefing.token}` : null;

  const rodar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => setErro((await fn()).erro ?? null));

  const copiar = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  if (!briefing || briefing.status === "rascunho") {
    return (
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[#F5F5F4] mb-1">Briefing do cliente</p>
          <p className="text-xs text-[#968F88] leading-relaxed max-w-prose">
            Gera um link pro cliente responder as perguntas sozinho. Ele salva conforme escreve e pode voltar depois,
            então não precisa terminar de uma vez. Você recebe um e-mail quando ele enviar.
          </p>
        </div>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => liberarBriefing(projetoId))}
          className="px-4 py-2 bg-brand-400 hover:bg-brand-300 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
        >
          {pendente ? "Gerando…" : "Gerar link do briefing"}
        </button>
      </Card>
    );
  }

  const respondido = briefing.status === "respondido";

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#F5F5F4] mb-1">Briefing do cliente</p>
            <p className="text-[11px] text-[#968F88]">
              {respondido
                ? `Enviado pelo cliente em ${fmtData(briefing.respondido_em)}`
                : briefing.vista_em
                  ? `Aberto pelo cliente em ${fmtData(briefing.vista_em)}`
                  : "Link gerado, ainda não aberto"}
            </p>
          </div>
          <Pill tom={respondido ? "success" : briefing.vista_em ? "info" : "muted"}>
            {respondido ? "Respondido" : briefing.vista_em ? "Em preenchimento" : "Aguardando"}
          </Pill>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-[11px] font-mono text-[#968F88] bg-[#1B0F27] border border-[#311C45] rounded-lg px-3 py-2">
            {link}
          </code>
          <button
            type="button"
            onClick={copiar}
            className="px-3 py-2 text-[11px] text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors whitespace-nowrap"
          >
            {copiado ? "Copiado ✓" : "Copiar"}
          </button>
          <a
            href={link ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 text-[11px] text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors whitespace-nowrap"
          >
            Abrir
          </a>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-[#968F88]">
            {p.respondidas} de {p.total} respondidas
            {p.naoSei > 0 && <span className="text-amber-400/80"> · {p.naoSei} sem resposta do cliente</span>}
          </span>
          <div className="flex-1 h-1 rounded-full bg-[#311C45] overflow-hidden">
            <div className="h-full bg-brand-400" style={{ width: `${p.percentual}%` }} />
          </div>
          <span className="font-mono text-[#968F88]">{p.percentual}%</span>
        </div>

        {erro && <p className="text-xs text-red-400">{erro}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {respondido && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(() => reabrirBriefing(projetoId))}
              className="px-3 py-1.5 text-[11px] text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors"
            >
              Reabrir pro cliente editar
            </button>
          )}
          <button
            type="button"
            disabled={pendente}
            onClick={() => confirm("Gerar um link novo derruba o atual. O cliente precisará do endereço novo. Continuar?") && rodar(() => trocarTokenBriefing(projetoId))}
            className="px-3 py-1.5 text-[11px] text-[#5A496A] hover:text-red-400 transition-colors"
          >
            Gerar link novo
          </button>
        </div>
      </Card>

      {p.naoSei > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-200/90 leading-relaxed">
            O cliente marcou <strong>{p.naoSei}</strong>{" "}
            {p.naoSei === 1 ? "pergunta" : "perguntas"} como &ldquo;não sei responder&rdquo;. É onde ele precisa de você —
            aparecem destacadas abaixo.
          </p>
        </Card>
      )}

      {grupos.map((g) => (
        <Card key={g.secao} className="space-y-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#968F88] pb-2 border-b border-[#311C45]">
            {g.secao}
          </p>
          {g.perguntas.map((pergunta) => (
            <LinhaResposta
              key={pergunta.chave}
              projetoId={projetoId}
              pergunta={pergunta}
              resposta={respostas[pergunta.chave]}
            />
          ))}
        </Card>
      ))}
    </div>
  );
}

function LinhaResposta({
  projetoId,
  pergunta,
  resposta,
}: {
  projetoId: string;
  pergunta: PerguntaBriefing;
  resposta: { t?: string; ns?: boolean } | undefined;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(resposta?.t ?? "");
  const [pendente, iniciar] = useTransition();

  const naoSei = !!resposta?.ns;
  const vazia = !naoSei && !resposta?.t?.trim();

  const salvar = () =>
    iniciar(async () => {
      await ajustarRespostaBriefing(projetoId, pergunta.chave, texto);
      setEditando(false);
    });

  return (
    <div>
      <p className="text-[11px] text-[#968F88] leading-relaxed mb-1">{pergunta.texto}</p>

      {editando ? (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
            className="w-full bg-[#1B0F27] border border-[#311C45] rounded-lg px-3 py-2 text-sm text-[#DDDBD9] focus:outline-none focus:border-brand-400 transition-colors leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={salvar}
              className="px-3 py-1.5 text-[11px] bg-brand-400 hover:bg-brand-300 text-white rounded-lg transition-colors disabled:opacity-40"
            >
              {pendente ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => { setTexto(resposta?.t ?? ""); setEditando(false); }}
              className="px-3 py-1.5 text-[11px] text-[#968F88] hover:text-[#DDDBD9] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          title="Clique pra completar ou corrigir"
          className={cn(
            "w-full text-left text-sm rounded-lg px-3 py-2 border transition-colors",
            naoSei
              ? "text-amber-300/90 bg-amber-500/10 border-amber-500/25 italic"
              : vazia
                ? "text-[#5A496A] border-dashed border-[#311C45] hover:border-[#5A496A] italic"
                : "text-[#DDDBD9] bg-[#1B0F27] border-[#311C45] hover:border-[#5A496A] whitespace-pre-wrap leading-relaxed",
          )}
        >
          {naoSei
            ? "O cliente não soube responder — vocês veem juntos"
            : vazia
              ? "Em branco"
              : rotuloResposta(pergunta, resposta?.t ?? "")}
        </button>
      )}
    </div>
  );
}
