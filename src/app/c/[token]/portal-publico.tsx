"use client";

import Image from "next/image";
import { BotaoTema } from "@/components/botao-tema";
import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { fmt, fmtData } from "@/lib/format";
import { FASE_CLIENTE, pendenciasDoCliente, progressoEtapas, type Aprovacao, type EtapaPortal } from "@/lib/portal";
import type { StatusProjeto, TipoPagamento } from "@/lib/constantes";
import type { StatusPagamento } from "@/lib/types";
import { decidirAprovacao, enviarRecado } from "./actions";

/*
 * Portal do cliente. Mesma calma da proposta e do briefing: página estreita, sem
 * menu, sem login. A ordem dos blocos é a resposta a três perguntas, nessa ordem,
 * porque é essa a ordem em que o cliente pergunta:
 *
 * 1. "Em que pé está?"      → fase + progresso das etapas
 * 2. "Falta algo de mim?"   → pendências e aprovações, no topo quando existem
 * 3. "E o pagamento?"       → parcelas, só leitura
 */

type Contato = { nome: string; titulo: string; email: string | null; telefone: string | null };
type Parcela = { id: string; tipo: TipoPagamento | null; valor: number; vencimento: string; status: StatusPagamento };

export function PortalPublico({
  token,
  projeto,
  cliente,
  etapas,
  aprovacoes: aprovacoesIniciais,
  parcelas,
  linkBriefing,
  contato,
}: {
  token: string;
  projeto: { nome: string; tipo: string | null; status: StatusProjeto; prazo: string | null };
  cliente: string | null;
  etapas: EtapaPortal[];
  aprovacoes: Aprovacao[];
  parcelas: Parcela[];
  linkBriefing: string | null;
  contato: Contato;
}) {
  const [aprovacoes, setAprovacoes] = useState(aprovacoesIniciais);
  const fase = FASE_CLIENTE[projeto.status];
  const p = useMemo(() => progressoEtapas(etapas), [etapas]);

  const aguardando = aprovacoes.filter((a) => a.status === "aguardando");
  const decididas = aprovacoes.filter((a) => a.status !== "aguardando");
  const pendencias = pendenciasDoCliente({ aprovacoes, briefingPendente: !!linkBriefing });

  const registrar = (id: string, status: Aprovacao["status"], quem: string, comentario: string) =>
    setAprovacoes((lista) =>
      lista.map((a) =>
        a.id === id
          ? { ...a, status, decidido_por: quem, comentario_cliente: comentario || null, decidido_em: new Date().toISOString() }
          : a,
      ),
    );

  return (
    <Moldura contato={contato}>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[1px] text-texto-apagado mb-2">
          {cliente ? `Projeto de ${cliente}` : "Seu projeto"}
        </p>
        <h1 className="text-2xl sm:text-3xl text-texto mb-3">{projeto.nome}</h1>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-400/15 text-brand-300 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            {fase.rotulo}
          </span>
          {projeto.tipo && <span className="text-[11px] text-texto-apagado">{projeto.tipo}</span>}
        </div>
        <p className="text-sm text-texto-mudo leading-relaxed">{fase.frase}</p>
        {projeto.prazo && (
          <p className="text-xs text-texto-apagado mt-2">
            Previsão de entrega: <strong className="text-texto-mudo">{fmtData(projeto.prazo)}</strong>
          </p>
        )}
      </header>

      {pendencias.length > 0 && (
        <div className="mb-8 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-xs text-alerta-cor/90 leading-relaxed">
            <strong>Esperando você:</strong> {pendencias.join(" · ")}.
          </p>
          {linkBriefing && (
            <a
              href={linkBriefing}
              className="inline-block mt-2 text-xs font-semibold text-alerta-cor underline underline-offset-2 hover:text-alerta-cor"
            >
              Responder o briefing
            </a>
          )}
        </div>
      )}

      {aguardando.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[1px] text-texto-apagado mb-3">Para você aprovar</h2>
          <div className="space-y-3">
            {aguardando.map((a) => (
              <CartaoAprovacao key={a.id} aprovacao={a} token={token} onDecidir={registrar} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[11px] uppercase tracking-[1px] text-texto-apagado">Andamento</h2>
          {p.total > 0 && (
            <span className="text-[11px] font-mono text-texto-mudo">
              {p.feitas}/{p.total} · {p.percentual}%
            </span>
          )}
        </div>

        {p.total === 0 ? (
          <p className="text-sm text-texto-mudo">As etapas aparecem aqui quando a produção começar.</p>
        ) : (
          <>
            <div className="h-1 rounded-full bg-superficie-2 overflow-hidden mb-5">
              <div className="h-full bg-brand-400 transition-all duration-500" style={{ width: `${p.percentual}%` }} />
            </div>
            <ol className="space-y-0">
              {etapas.map((e) => (
                <li key={e.id} className="flex gap-3 py-2.5 border-b border-borda last:border-0">
                  <Marcador estado={e.estado} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        e.estado === "feita" && "text-texto-mudo",
                        e.estado === "atual" && "text-texto font-semibold",
                        e.estado === "proxima" && "text-texto-apagado",
                      )}
                    >
                      {e.titulo}
                    </p>
                    <p className="text-[11px] text-texto-apagado mt-0.5">
                      {e.estado === "feita" && `Concluída em ${fmtData(e.concluidaEm)}`}
                      {e.estado === "atual" && "Em andamento agora"}
                      {e.estado === "proxima" && "A fazer"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {parcelas.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[1px] text-texto-apagado mb-3">Pagamentos</h2>
          <ul className="space-y-0">
            {parcelas.map((parcela) => (
              <li key={parcela.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-borda last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-texto-suave">{fmt(parcela.valor)}</p>
                  <p className="text-[11px] text-texto-apagado">
                    {parcela.status === "pago" ? "Pago" : `Vence em ${fmtData(parcela.vencimento)}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                    parcela.status === "pago" && "bg-emerald-500/15 text-sucesso-cor",
                    parcela.status === "pendente" && "bg-superficie-2 text-texto-mudo",
                    parcela.status === "atrasado" && "bg-red-500/20 text-falha-cor",
                  )}
                >
                  {parcela.status === "pago" ? "Pago" : parcela.status === "atrasado" ? "Vencido" : "A pagar"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {decididas.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[1px] text-texto-apagado mb-3">Já respondido</h2>
          <ul className="space-y-2">
            {decididas.map((a) => (
              <li key={a.id} className="text-xs text-texto-mudo leading-relaxed">
                <strong className={a.status === "aprovado" ? "text-sucesso-cor" : "text-alerta-cor"}>
                  {a.status === "aprovado" ? "Aprovado" : "Ajuste pedido"}
                </strong>{" "}
                · {a.titulo}
                {a.decidido_em && <span className="text-texto-apagado"> · {fmtData(a.decidido_em.slice(0, 10))}</span>}
                {a.decidido_por && <span className="text-texto-apagado"> · por {a.decidido_por}</span>}
                {a.comentario_cliente && <span className="block text-texto-apagado mt-0.5">“{a.comentario_cliente}”</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Recado token={token} />
    </Moldura>
  );
}

function Marcador({ estado }: { estado: EtapaPortal["estado"] }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-1 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold",
        estado === "feita" && "border-brand-400 bg-brand-400 text-white",
        estado === "atual" && "border-brand-400 text-brand-400",
        estado === "proxima" && "border-borda",
      )}
    >
      {estado === "feita" ? "✓" : ""}
    </span>
  );
}

function CartaoAprovacao({
  aprovacao,
  token,
  onDecidir,
}: {
  aprovacao: Aprovacao;
  token: string;
  onDecidir: (id: string, status: Aprovacao["status"], quem: string, comentario: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [comentario, setComentario] = useState("");
  const [pedindoAjuste, setPedindoAjuste] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();

  const decidir = (decisao: "aprovado" | "ajuste") =>
    enviar(async () => {
      const r = await decidirAprovacao(token, aprovacao.id, decisao, nome, comentario);
      if (r.erro) setErro(r.erro);
      else onDecidir(aprovacao.id, decisao, nome.trim(), comentario.trim());
    });

  return (
    <div className="rounded-xl border border-borda bg-campo p-4 sm:p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-texto mb-1">{aprovacao.titulo}</p>
        {aprovacao.descricao && <p className="text-xs text-texto-mudo leading-relaxed whitespace-pre-line">{aprovacao.descricao}</p>}
      </div>

      {aprovacao.link && (
        <a
          href={aprovacao.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-lg border border-brand-400 text-brand-300 hover:bg-brand-400/10 text-xs font-semibold transition-colors"
        >
          Ver o material →
        </a>
      )}

      <div className="space-y-3 pt-1">
        <label className="block">
          <span className="block text-[11px] text-texto-mudo mb-1.5">Seu nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Quem está respondendo?"
            className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-sm text-texto-suave placeholder:text-texto-apagado focus:border-brand-400 focus:outline-none"
          />
        </label>

        {pedindoAjuste && (
          <label className="block">
            <span className="block text-[11px] text-texto-mudo mb-1.5">O que você quer que eu ajuste?</span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              placeholder="Quanto mais específico, mais rápido eu resolvo."
              className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-sm text-texto-suave placeholder:text-texto-apagado focus:border-brand-400 focus:outline-none resize-y"
            />
          </label>
        )}

        {erro && <p className="text-xs text-falha-cor">{erro}</p>}

        <div className="flex flex-wrap gap-2">
          {pedindoAjuste ? (
            <>
              <button
                type="button"
                disabled={enviando}
                onClick={() => decidir("ajuste")}
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-fundo text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {enviando ? "Enviando…" : "Enviar pedido de ajuste"}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setPedindoAjuste(false)}
                className="px-4 py-2.5 rounded-lg text-sm text-texto-mudo hover:text-texto-suave transition-colors"
              >
                Voltar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={enviando}
                onClick={() => decidir("aprovado")}
                className="px-5 py-2.5 rounded-lg bg-brand-400 hover:bg-brand-300 text-white text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {enviando ? "Registrando…" : "Aprovar"}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  setErro(null);
                  setPedindoAjuste(true);
                }}
                className="px-4 py-2.5 rounded-lg border border-borda text-sm text-texto-mudo hover:text-texto-suave hover:border-borda-forte transition-colors"
              >
                Pedir ajuste
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Recado({ token }: { token: string }) {
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, enviar] = useTransition();

  if (enviado) {
    return (
      <section className="pt-8 border-t border-borda">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs text-sucesso-cor/90 leading-relaxed">
            Recebi, obrigada! Vou responder por aqui ou pelo WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setTexto("");
            setLink("");
          }}
          className="mt-3 text-xs text-texto-mudo hover:text-texto-suave underline underline-offset-2"
        >
          Mandar outro recado
        </button>
      </section>
    );
  }

  return (
    <section className="pt-8 border-t border-borda space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-texto mb-1">Mandar recado ou material</h2>
        <p className="text-xs text-texto-mudo leading-relaxed">
          Textos, fotos, logo: suba numa pasta do Google Drive e cole o link aqui. Se for só um recado, escreva abaixo.
        </p>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder="Escreva aqui…"
        className="w-full bg-campo border border-borda rounded-lg px-3 py-2 text-sm text-texto-suave placeholder:text-texto-apagado focus:border-brand-400 focus:outline-none resize-y"
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://drive.google.com/… (opcional)"
        className="w-full bg-campo border border-borda rounded-lg px-3 py-2 text-sm text-texto-suave placeholder:text-texto-apagado focus:border-brand-400 focus:outline-none"
      />

      {erro && <p className="text-xs text-falha-cor">{erro}</p>}

      <button
        type="button"
        disabled={enviando}
        onClick={() =>
          enviar(async () => {
            const r = await enviarRecado(token, texto, link);
            if (r.erro) setErro(r.erro);
            else {
              setErro(null);
              setEnviado(true);
            }
          })
        }
        className="px-5 py-2.5 rounded-lg bg-brand-400 hover:bg-brand-300 text-white text-sm font-semibold transition-colors disabled:opacity-40"
      >
        {enviando ? "Enviando…" : "Enviar"}
      </button>
    </section>
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
