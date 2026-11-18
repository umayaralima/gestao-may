"use client";

import Image from "next/image";
import { BotaoTema } from "@/components/botao-tema";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { responderPropostaPublica } from "./actions";

/*
 * Visual da proposta pro cliente: mesma paleta do sistema, mas em página larga e calma,
 * com o aceite no fim. Sem login, sem menu — só a proposta e os dois botões.
 */

type PropostaView = {
  id: string;
  token: string;
  numero: string | null;
  titulo: string;
  documento: string;
  valor: number | null;
  validade: string | null;
  validadeFormatada: string | null;
  status: "rascunho" | "enviada" | "aceita" | "recusada" | "expirada";
  resposta: string | null;
};

export function PropostaPublica({
  proposta,
  contato,
}: {
  proposta: PropostaView;
  contato: { nome: string; titulo: string; email: string | null; telefone: string | null; site: string | null };
}) {
  const [status, setStatus] = useState(proposta.status);
  const [observacao, setObservacao] = useState("");
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [enviando, enviar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const responder = (resposta: "aceita" | "recusada") =>
    enviar(async () => {
      const r = await responderPropostaPublica(proposta.token, resposta, observacao);
      if (r.erro) setErro(r.erro);
      else setStatus(resposta);
    });

  return (
    <main className="min-h-dvh bg-fundo text-texto-suave">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <Image src="/marca/logo-gradiente.png" alt={contato.nome} width={531} height={131} priority className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            {proposta.numero && <span className="text-[11px] font-mono text-texto-mudo">Proposta {proposta.numero}</span>}
            <BotaoTema variante="flutuante" />
          </div>
        </header>

        {status === "aceita" && (
          <Aviso tom="sucesso" titulo="Proposta aceita 🎉" texto={`Obrigada! Em breve ${contato.nome.split(" ")[0]} entra em contato com o contrato e os próximos passos.`} />
        )}
        {status === "recusada" && <Aviso tom="neutro" titulo="Resposta registrada" texto="Obrigada pelo retorno! Se mudar de ideia ou quiser ajustar algo, é só chamar." />}
        {status === "expirada" && <Aviso tom="alerta" titulo="Proposta vencida" texto={`A validade era ${proposta.validadeFormatada}. Me chame que eu atualizo valores e prazo pra você.`} />}

        <article className="rounded-2xl border border-borda bg-superficie px-6 sm:px-10 py-8 sm:py-12">
          <Documento texto={proposta.documento} />
        </article>

        {status === "enviada" && (
          <section className="mt-8 rounded-2xl border border-brand-400/30 bg-brand-400/5 px-6 sm:px-10 py-8">
            <h2 className="text-lg font-semibold text-texto">Vamos começar?</h2>
            <p className="mt-1.5 text-sm text-texto-mudo">
              Ao aceitar, eu envio o contrato para assinatura eletrônica e o link do primeiro pagamento.
              {proposta.validadeFormatada && ` Esta proposta vale até ${proposta.validadeFormatada}.`}
            </p>

            {!mostrarRecusa ? (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => responder("aceita")}
                  className="px-6 py-3.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {enviando ? "Registrando…" : "Aceitar proposta"}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarRecusa(true)}
                  className="px-6 py-3.5 text-sm text-texto-mudo border border-borda hover:border-borda-forte hover:text-texto-suave rounded-xl transition-colors"
                >
                  Tenho dúvidas / quero ajustar
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={4}
                  placeholder="Conta pra mim o que você gostaria de mudar — prazo, escopo, valor, forma de pagamento…"
                  className="w-full bg-fundo border border-borda rounded-xl px-4 py-3 text-sm text-texto-suave placeholder:text-texto-apagado outline-none focus:border-brand-400/60 transition-colors"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={enviando || observacao.trim().length < 3}
                    onClick={() => responder("recusada")}
                    className="px-6 py-3 bg-superficie-2 hover:bg-[#3d2456] disabled:opacity-40 text-texto-suave text-sm font-medium rounded-xl transition-colors"
                  >
                    {enviando ? "Enviando…" : "Enviar observação"}
                  </button>
                  <button type="button" onClick={() => setMostrarRecusa(false)} className="px-6 py-3 text-sm text-texto-mudo hover:text-texto-suave transition-colors">
                    Voltar
                  </button>
                </div>
              </div>
            )}
            {erro && <p className="mt-3 text-xs text-falha-cor">{erro}</p>}
          </section>
        )}

        <footer className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-texto-mudo">
          <div>
            <p className="text-texto-sutil font-medium">{contato.nome}</p>
            <p>{contato.titulo}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {contato.email && (
              <a href={`mailto:${contato.email}`} className="hover:text-brand-400 transition-colors">
                {contato.email}
              </a>
            )}
            {contato.telefone && (
              <a href={`https://wa.me/55${contato.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-brand-400 transition-colors">
                {contato.telefone}
              </a>
            )}
            {contato.site && (
              <a href={contato.site.startsWith("http") ? contato.site : `https://${contato.site}`} target="_blank" rel="noreferrer" className="hover:text-brand-400 transition-colors">
                {contato.site.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}

function Aviso({ tom, titulo, texto }: { tom: "sucesso" | "alerta" | "neutro"; titulo: string; texto: string }) {
  const cores = {
    sucesso: "border-emerald-500/30 bg-emerald-500/10 text-sucesso-cor",
    alerta: "border-amber-500/30 bg-amber-500/10 text-alerta-cor",
    neutro: "border-borda bg-superficie text-texto-sutil",
  }[tom];
  return (
    <div className={cn("mb-6 rounded-2xl border px-6 py-5", cores)}>
      <p className="text-base font-semibold">{titulo}</p>
      <p className="mt-1 text-sm opacity-90">{texto}</p>
    </div>
  );
}

/** Mesmo markdown simples do contrato, em tipografia de leitura. */
function Documento({ texto }: { texto: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith("**") ? <strong key={i} className="font-semibold text-texto">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));

  return (
    <div className="space-y-3">
      {texto.split("\n").map((linha, i) => {
        if (!linha.trim()) return <div key={i} className="h-2" />;
        if (linha.startsWith("# ")) return <p key={i} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400">{linha.slice(2)}</p>;
        if (linha.startsWith("## ")) return <h1 key={i} className="text-2xl sm:text-3xl font-semibold text-texto leading-tight">{linha.slice(3)}</h1>;
        if (linha.startsWith("### ")) return <h2 key={i} className="pt-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-texto-mudo">{linha.slice(4)}</h2>;
        if (linha.startsWith("- ")) {
          const conteudo = linha.slice(2).replace(/^\d+\.\s*/, "");
          const numerado = /^\d+\./.test(linha.slice(2));
          return (
            <p key={i} className="flex gap-3 text-sm leading-relaxed text-texto-sutil">
              <span className={cn("shrink-0", numerado ? "text-brand-400 font-mono text-xs pt-0.5" : "text-brand-400")}>{numerado ? linha.slice(2).match(/^\d+/)?.[0] : "—"}</span>
              <span>{inline(conteudo)}</span>
            </p>
          );
        }
        return <p key={i} className="text-sm leading-relaxed text-texto-sutil">{inline(linha)}</p>;
      })}
    </div>
  );
}
