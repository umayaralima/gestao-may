"use client";

import Image from "next/image";
import { BotaoTema } from "@/components/botao-tema";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  perguntasVisiveis,
  porSecao,
  progresso,
  type PerguntaBriefing,
  type Resposta,
  type Respostas,
  type StatusBriefing,
} from "@/lib/briefing";
import { enviarBriefing, salvarResposta } from "./actions";

/*
 * Briefing do cliente. Mesma calma da proposta pública: página estreita, sem menu,
 * sem login. Três decisões que vêm do que a May contou sobre os clientes dela:
 *
 * 1. Salva sozinho, campo a campo. São 49 perguntas; ninguém termina de uma vez.
 * 2. Todo campo tem "não sei responder". Muito cliente não sabe quem é a própria
 *    persona, e um branco não diz se ele pulou ou se travou.
 * 3. Só 3 perguntas são obrigatórias. O resto ele responde o que conseguir.
 */

type Contato = { nome: string; titulo: string; email: string | null; telefone: string | null };

export function BriefingPublico({
  token,
  status: statusInicial,
  respostasIniciais,
  perguntas,
  tipoProjeto,
  projeto,
  cliente,
  intro,
  contato,
}: {
  token: string;
  status: StatusBriefing;
  respostasIniciais: Respostas;
  perguntas: PerguntaBriefing[];
  tipoProjeto: string | null;
  projeto: string;
  cliente: string | null;
  intro: string;
  contato: Contato;
}) {
  const [respostas, setRespostas] = useState<Respostas>(respostasIniciais);
  const [status, setStatus] = useState(statusInicial);
  const [salvando, setSalvando] = useState<Set<string>>(new Set());
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();

  // Blocos A/B/C entram e saem conforme as respostas, então recalcula a cada mudança.
  const visiveis = useMemo(() => perguntasVisiveis(perguntas, tipoProjeto, respostas), [perguntas, tipoProjeto, respostas]);
  const grupos = useMemo(() => porSecao(visiveis), [visiveis]);
  const p = useMemo(() => progresso(visiveis, respostas), [visiveis, respostas]);

  const marcarSalvando = (chave: string, ativo: boolean) =>
    setSalvando((s) => {
      const novo = new Set(s);
      if (ativo) novo.add(chave);
      else novo.delete(chave);
      return novo;
    });

  const gravar = useCallback(
    async (chave: string, valor: Resposta) => {
      marcarSalvando(chave, true);
      const r = await salvarResposta(token, chave, valor);
      marcarSalvando(chave, false);
      setErroSalvar(r.erro ?? null);
    },
    [token],
  );

  const mudar = (chave: string, valor: Resposta) => setRespostas((r) => ({ ...r, [chave]: valor }));

  if (status === "respondido") {
    return (
      <Moldura contato={contato}>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-6 py-8 text-center">
          <p className="text-lg font-semibold text-texto mb-2">Briefing enviado 🎉</p>
          <p className="text-sm text-texto-sutil leading-relaxed">
            Obrigada, {cliente?.split(" ")[0] ?? "pessoa"}! Recebi tudo e já começo a trabalhar no {projeto}.
            <br />
            Se lembrar de algo que ficou de fora, é só me chamar.
          </p>
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura contato={contato}>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif italic text-texto mb-3">Briefing do seu site</h1>
        {cliente && <p className="text-sm text-texto-mudo mb-4">{cliente} · {projeto}</p>}
        {intro && (
          <div className="space-y-3 text-sm text-texto-sutil leading-relaxed">
            {intro.split("\n").filter((l) => l.trim()).map((linha, i) => <p key={i}>{linha}</p>)}
          </div>
        )}
      </header>

      <Progresso progresso={p} />

      <div className="space-y-10 mt-8">
        {grupos.map((g) => (
          <section key={g.secao}>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-texto-mudo mb-5 pb-2 border-b border-borda">
              {g.secao}
            </h2>
            <div className="space-y-7">
              {g.perguntas.map((pergunta) => (
                <CampoPergunta
                  key={pergunta.chave}
                  pergunta={pergunta}
                  resposta={respostas[pergunta.chave]}
                  salvando={salvando.has(pergunta.chave)}
                  onMudar={(v) => mudar(pergunta.chave, v)}
                  onGravar={(v) => gravar(pergunta.chave, v)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-borda space-y-4">
        {p.faltamObrigatorias.length > 0 && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-alerta-cor/90 leading-relaxed">
              Antes de enviar, só preciso destas: <strong>{p.faltamObrigatorias.map((q) => q.texto).join(" · ")}</strong>
            </p>
          </div>
        )}
        {erroEnvio && <p className="text-xs text-falha-cor">{erroEnvio}</p>}

        <button
          type="button"
          disabled={p.faltamObrigatorias.length > 0 || enviando}
          onClick={() =>
            enviar(async () => {
              const r = await enviarBriefing(token);
              if (r.erro) setErroEnvio(r.erro);
              else setStatus("respondido");
            })
          }
          className={cn(
            "w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-colors",
            p.faltamObrigatorias.length > 0 || enviando
              ? "bg-superficie-2 text-texto-apagado cursor-not-allowed"
              : "bg-brand-400 hover:bg-brand-300 text-white",
          )}
        >
          {enviando ? "Enviando…" : "Enviar briefing"}
        </button>

        <p className="text-[11px] text-texto-apagado leading-relaxed">
          Suas respostas são salvas sozinhas conforme você escreve. Pode fechar e voltar depois pelo mesmo link —
          nada se perde. O botão acima é só pra me avisar que terminou.
        </p>
        {erroSalvar && (
          <p className="text-[11px] text-falha-cor">
            {erroSalvar} — copie o que escreveu antes de fechar a página, por segurança.
          </p>
        )}
      </div>
    </Moldura>
  );
}

function Progresso({ progresso: p }: { progresso: ReturnType<typeof progresso> }) {
  return (
    <div className="sticky top-0 z-10 -mx-5 px-5 py-3 bg-fundo/95 backdrop-blur border-b border-borda">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] text-texto-mudo">
          {p.respondidas} de {p.total} respondidas
          {p.naoSei > 0 && <span className="text-texto-apagado"> · {p.naoSei} em aberto</span>}
        </span>
        <span className="text-[11px] font-mono text-texto-mudo">{p.percentual}%</span>
      </div>
      <div className="h-1 rounded-full bg-superficie-2 overflow-hidden">
        <div className="h-full bg-brand-400 transition-all duration-300" style={{ width: `${p.percentual}%` }} />
      </div>
    </div>
  );
}

function CampoPergunta({
  pergunta,
  resposta,
  salvando,
  onMudar,
  onGravar,
}: {
  pergunta: PerguntaBriefing;
  resposta: Resposta | undefined;
  salvando: boolean;
  onMudar: (v: Resposta) => void;
  onGravar: (v: Resposta) => void;
}) {
  const naoSei = !!resposta?.ns;
  const valor = resposta?.t ?? "";
  // Só grava no blur se mudou: evita uma ida ao servidor a cada campo tocado.
  const ultimoGravado = useRef(valor);

  const aoSair = () => {
    if (valor !== ultimoGravado.current) {
      ultimoGravado.current = valor;
      onGravar({ t: valor });
    }
  };

  const alternarNaoSei = () => {
    const novo: Resposta = naoSei ? {} : { ns: true };
    ultimoGravado.current = "";
    onMudar(novo);
    onGravar(novo);
  };

  const campoCls =
    "w-full bg-campo border border-borda rounded-lg px-3.5 py-2.5 text-sm text-texto-suave placeholder:text-texto-apagado focus:outline-none focus:border-brand-400 transition-colors disabled:opacity-40";

  return (
    <div>
      <label htmlFor={pergunta.chave} className="block text-sm text-texto-suave leading-relaxed mb-1">
        {pergunta.texto}
        {pergunta.obrigatoria && <span className="text-brand-400 ml-1" title="Obrigatória">*</span>}
      </label>
      {pergunta.ajuda && <p className="text-[11px] text-texto-mudo leading-relaxed mb-2">{pergunta.ajuda}</p>}

      {pergunta.tipo === "sim_nao" ? (
        <div className="flex gap-2">
          {[
            { v: "sim", label: "Sim" },
            { v: "nao", label: "Não" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              disabled={naoSei}
              onClick={() => {
                const novo = { t: o.v };
                ultimoGravado.current = o.v;
                onMudar(novo);
                onGravar(novo);
              }}
              className={cn(
                "px-5 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40",
                valor === o.v
                  ? "bg-brand-400/15 text-brand-400 border-brand-400/30 font-medium"
                  : "text-texto-mudo border-borda hover:border-borda-forte",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : pergunta.tipo === "texto_longo" ? (
        <textarea
          id={pergunta.chave}
          rows={3}
          disabled={naoSei}
          value={valor}
          onChange={(e) => onMudar({ t: e.target.value })}
          onBlur={aoSair}
          className={cn(campoCls, "resize-y leading-relaxed")}
        />
      ) : (
        <input
          id={pergunta.chave}
          type={pergunta.tipo === "link" ? "url" : "text"}
          inputMode={pergunta.tipo === "link" ? "url" : undefined}
          placeholder={pergunta.tipo === "link" ? "https://" : undefined}
          disabled={naoSei}
          value={valor}
          onChange={(e) => onMudar({ t: e.target.value })}
          onBlur={aoSair}
          className={campoCls}
        />
      )}

      <div className="flex items-center justify-between gap-3 mt-1.5">
        {pergunta.obrigatoria ? (
          <span className="text-[10px] text-texto-apagado">Preciso desta pra montar o site</span>
        ) : (
          <button
            type="button"
            onClick={alternarNaoSei}
            className={cn(
              "text-[11px] transition-colors",
              naoSei ? "text-brand-400 font-medium" : "text-texto-apagado hover:text-texto-mudo",
            )}
          >
            {naoSei ? "✓ não sei responder — a gente vê junto" : "não sei responder"}
          </button>
        )}
        {salvando && <span className="text-[10px] text-texto-apagado">salvando…</span>}
      </div>
    </div>
  );
}

function Moldura({ contato, children }: { contato: Contato; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-fundo text-texto-suave">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Image src="/marca/logo-gradiente.png" alt={contato.nome} width={531} height={131} priority className="h-8 w-auto" />
          <BotaoTema variante="flutuante" />
        </header>

        {children}

        <footer className="mt-14 pt-6 border-t border-borda text-[11px] text-texto-apagado leading-relaxed">
          {contato.nome} · {contato.titulo}
          {contato.email && <> · {contato.email}</>}
          {contato.telefone && <> · {contato.telefone}</>}
        </footer>
      </div>
    </main>
  );
}
