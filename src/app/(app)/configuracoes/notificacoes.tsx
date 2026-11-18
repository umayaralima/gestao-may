"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { fmtData } from "@/lib/format";
import { enviarResumoAgora, salvarNotificacoes, trocarTokenAgenda, type FormState } from "./actions";

export type UltimoEnvio = { dia: string; destino: string; itens: number; erro: string | null } | null;

/*
 * Aba Notificações: resumo diário por e-mail (cron das 7h) e link do calendário (iCal).
 * Estava fora do transplante do Make por não existir envio; agora existe.
 */
export function Notificacoes({
  ativo,
  email,
  emailLogin,
  linkAgenda,
  ultimoEnvio,
  onSalvo,
}: {
  ativo: boolean;
  email: string | null;
  emailLogin: string;
  linkAgenda: string | null;
  ultimoEnvio: UltimoEnvio;
  onSalvo: (msg: string) => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(salvarNotificacoes, {});
  const [ligado, setLigado] = useState(ativo);
  const [enviando, iniciarEnvio] = useTransition();
  const [trocando, iniciarTroca] = useTransition();
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (state.ok) onSalvo("Alterações salvas com sucesso");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const copiar = async () => {
    if (!linkAgenda) return;
    try {
      await navigator.clipboard.writeText(linkAgenda);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="space-y-5 entrar">
      <div>
        <h2 className="text-lg font-semibold text-texto mb-0.5">Notificações</h2>
        <p className="text-xs text-texto-mudo">Resumo do dia por e-mail e agenda no seu calendário</p>
      </div>

      <form action={action} className="space-y-5">
        <Secao titulo="Resumo diário" sub="Todo dia às 7h: tarefas do dia, etapas atrasadas, follow-ups, cobranças e entregas próximas.">
          <Linha rotulo="Enviar o resumo" descricao="Se estiver desligado, o sistema não manda nada.">
            <input type="hidden" name="resumo_diario" value={ligado ? "on" : "false"} />
            <button
              type="button"
              onClick={() => setLigado((v) => !v)}
              role="switch"
              aria-checked={ligado}
              className={cn("relative w-9 h-5 rounded-full transition-colors shrink-0", ligado ? "bg-brand-400" : "bg-superficie-2")}
            >
              <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", ligado ? "translate-x-4" : "translate-x-0")} />
            </button>
          </Linha>
          <Linha rotulo="Enviar para" descricao={`Vazio usa o e-mail de contato do Perfil (hoje: ${email || emailLogin}).`}>
            <input
              name="resumo_email"
              type="email"
              defaultValue={email ?? ""}
              placeholder={emailLogin}
              className="bg-campo border border-borda rounded-lg px-3 py-2 text-sm text-texto-suave placeholder:text-texto-apagado outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 transition-all w-full sm:w-64"
            />
          </Linha>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
            <div className="text-[11px] text-texto-mudo">
              {ultimoEnvio ? (
                ultimoEnvio.erro ? (
                  <span className="text-falha-cor">Último envio ({fmtData(ultimoEnvio.dia)}) falhou: {ultimoEnvio.erro}</span>
                ) : (
                  <>
                    Último envio em <span className="text-texto-sutil">{fmtData(ultimoEnvio.dia)}</span> para {ultimoEnvio.destino} · {ultimoEnvio.itens} item(ns)
                  </>
                )
              ) : (
                "Nenhum resumo enviado ainda."
              )}
            </div>
            <div className="flex items-center gap-3">
              {erroEnvio && <span className="text-[11px] text-falha-cor">{erroEnvio}</span>}
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  iniciarEnvio(async () => {
                    const r = await enviarResumoAgora();
                    setErroEnvio(r.erro ?? null);
                    if (r.ok) onSalvo("Resumo enviado");
                  })
                }
                className="px-3 py-2 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
              >
                {enviando ? "Enviando…" : "Enviar agora"}
              </button>
            </div>
          </div>
        </Secao>

        <div className="flex items-center justify-end gap-3">
          {state.erro && <p className="text-xs text-falha-cor">{state.erro}</p>}
          <button type="submit" disabled={pending} className="px-4 py-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>

      <Secao titulo="Agenda no seu calendário" sub="Assine este link no Google Agenda (Outros calendários → A partir do URL) pra ver tarefas e entregas no celular. É um link secreto: não compartilhe.">
        <div className="px-6 py-4 space-y-3">
          {linkAgenda ? (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={linkAgenda}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-campo border border-borda rounded-lg px-3 py-2 text-xs font-mono text-texto-sutil outline-none focus:border-brand-400/60"
                />
                <button type="button" onClick={copiar} className="px-3 py-2 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors whitespace-nowrap">
                  {copiado ? "Copiado ✓" : "Copiar link"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(linkAgenda)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-brand-400 hover:text-brand-300"
                >
                  Abrir o Google Agenda pra assinar →
                </a>
                <button
                  type="button"
                  disabled={trocando}
                  onClick={() => iniciarTroca(() => trocarTokenAgenda())}
                  className="text-[11px] text-texto-mudo hover:text-falha-cor transition-colors disabled:opacity-40"
                  title="Invalida o link atual e gera outro"
                >
                  {trocando ? "Gerando…" : "Gerar novo link"}
                </button>
              </div>
              <p className="text-[11px] text-texto-apagado">O Google atualiza calendários assinados a cada poucas horas — mudanças não aparecem na hora.</p>
            </>
          ) : (
            <p className="text-xs text-texto-mudo">Rode a migração 009_notificacoes.sql no Supabase pra gerar o link.</p>
          )}
        </div>
      </Secao>
    </div>
  );
}

function Secao({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-superficie border border-borda rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-borda">
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        {sub && <p className="text-xs text-texto-mudo mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      <div className="divide-y divide-borda/60">{children}</div>
    </div>
  );
}

function Linha({ rotulo, descricao, children }: { rotulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 gap-3 sm:gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-texto-suave font-medium">{rotulo}</p>
        {descricao && <p className="text-xs text-texto-mudo mt-0.5 leading-relaxed">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}
