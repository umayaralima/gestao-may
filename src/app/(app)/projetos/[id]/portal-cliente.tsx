"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { BotaoConfirmar } from "@/components/ui/modal";
import { Campo, Card, Input, MensagemErro, Pill, Textarea, Vazio } from "@/components/ui/primitivos";
import { fmtData } from "@/lib/format";
import type { Aprovacao } from "@/lib/portal";
import {
  excluirAprovacao,
  liberarPortal,
  reabrirAprovacao,
  revogarPortal,
  trocarTokenPortal,
  type FormState,
} from "../actions";

/*
 * Aba Portal do projeto, lado da May. O portal em si é a página pública /c/[token];
 * aqui ela libera o link, abre pedidos de aprovação e lê o que o cliente respondeu.
 *
 * O que ela mais precisa enxergar é o que está parado esperando o cliente — por
 * isso os pedidos aguardando ficam no topo e o comentário de ajuste aparece
 * inteiro, não truncado: é o briefing do retrabalho.
 */
export function PortalCliente({
  projetoId,
  portalToken,
  liberadoEm,
  vistaEm,
  aprovacoes,
  criar,
  linkBase,
}: {
  projetoId: string;
  portalToken: string | null;
  liberadoEm: string | null;
  vistaEm: string | null;
  aprovacoes: Aprovacao[];
  criar: (prev: FormState, fd: FormData) => Promise<FormState>;
  linkBase: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const link = portalToken ? `${linkBase}/c/${portalToken}` : null;

  const rodar = (fn: () => Promise<FormState>) => iniciar(async () => setErro((await fn()).erro ?? null));

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

  if (!portalToken) {
    return (
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[#F5F5F4] mb-1">Portal do cliente</p>
          <p className="text-xs text-[#968F88] leading-relaxed max-w-prose">
            Gera um link onde o cliente acompanha as etapas, aprova layout e manda material, sem precisar te chamar pra
            perguntar como está. Ele vê a fase do projeto, o andamento e as parcelas — não vê observação interna nem
            prazo de etapa.
          </p>
        </div>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => liberarPortal(projetoId))}
          className="px-4 py-2 bg-brand-400 hover:bg-brand-300 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
        >
          {pendente ? "Gerando…" : "Gerar link do portal"}
        </button>
      </Card>
    );
  }

  const aguardando = aprovacoes.filter((a) => a.status === "aguardando");
  const respondidas = aprovacoes.filter((a) => a.status !== "aguardando");

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#F5F5F4] mb-1">Portal do cliente</p>
            <p className="text-[11px] text-[#968F88]">
              {vistaEm
                ? `Aberto pelo cliente em ${fmtData(vistaEm.slice(0, 10))}`
                : liberadoEm
                  ? `Link gerado em ${fmtData(liberadoEm.slice(0, 10))}, ainda não aberto`
                  : "Link gerado, ainda não aberto"}
            </p>
          </div>
          <Pill tom={vistaEm ? "success" : "muted"}>{vistaEm ? "Em uso" : "Aguardando"}</Pill>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-[11px] font-mono text-[#968F88] bg-[#1B0F27] border border-[#311C45] rounded-lg px-3 py-2">
            {link}
          </code>
          <button
            type="button"
            onClick={copiar}
            className="shrink-0 px-3 py-2 border border-[#311C45] hover:border-brand-400 text-[#DDDBD9] text-xs font-semibold rounded-lg transition-colors"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>

        {erro && <p className="text-xs text-red-400">{erro}</p>}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => trocarTokenPortal(projetoId))}
            className="text-[11px] text-[#968F88] hover:text-[#DDDBD9] underline underline-offset-2 disabled:opacity-40"
          >
            Gerar link novo (derruba o atual)
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => revogarPortal(projetoId))}
            className="text-[11px] text-red-400 hover:text-red-300 underline underline-offset-2 disabled:opacity-40"
          >
            Revogar acesso
          </button>
        </div>
      </Card>

      <NovaAprovacao criar={criar} />

      {aguardando.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-[#F5F5F4]">Esperando o cliente</p>
          {aguardando.map((a) => (
            <LinhaAprovacao key={a.id} aprovacao={a} projetoId={projetoId} />
          ))}
        </Card>
      )}

      {respondidas.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-[#F5F5F4]">Respondido</p>
          {respondidas.map((a) => (
            <LinhaAprovacao key={a.id} aprovacao={a} projetoId={projetoId} />
          ))}
        </Card>
      )}

      {aprovacoes.length === 0 && (
        <Card>
          <Vazio
            icone="👀"
            titulo="Nenhum pedido de aprovação"
            sub="Abra um quando tiver layout ou texto pro cliente conferir. Fica registrado quem aprovou e quando."
          />
        </Card>
      )}
    </div>
  );
}

function LinhaAprovacao({ aprovacao, projetoId }: { aprovacao: Aprovacao; projetoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const rodar = (fn: () => Promise<FormState>) => iniciar(async () => setErro((await fn()).erro ?? null));

  const tom = aprovacao.status === "aprovado" ? "success" : aprovacao.status === "ajuste" ? "warning" : "muted";
  const rotulo = aprovacao.status === "aprovado" ? "Aprovado" : aprovacao.status === "ajuste" ? "Ajuste pedido" : "Aguardando";

  return (
    <div className="rounded-lg border border-[#311C45] bg-[#1B0F27] p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-[#F5F5F4] font-medium">{aprovacao.titulo}</p>
          <p className="text-[11px] text-[#5A496A]">
            Aberto em {fmtData(aprovacao.criado_em.slice(0, 10))}
            {aprovacao.decidido_em && <> · respondido em {fmtData(aprovacao.decidido_em.slice(0, 10))}</>}
            {aprovacao.decidido_por && <> por {aprovacao.decidido_por}</>}
          </p>
        </div>
        <Pill tom={tom}>{rotulo}</Pill>
      </div>

      {aprovacao.descricao && <p className="text-xs text-[#968F88] whitespace-pre-line leading-relaxed">{aprovacao.descricao}</p>}

      {aprovacao.link && (
        <a
          href={aprovacao.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[11px] text-brand-300 hover:text-brand-200 underline underline-offset-2 break-all"
        >
          {aprovacao.link}
        </a>
      )}

      {aprovacao.comentario_cliente && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[1px] text-amber-300/70 mb-1">O cliente pediu</p>
          <p className="text-xs text-amber-100/90 whitespace-pre-line leading-relaxed">{aprovacao.comentario_cliente}</p>
        </div>
      )}

      {erro && <p className="text-xs text-red-400">{erro}</p>}

      <div className="flex flex-wrap gap-3 pt-0.5">
        {aprovacao.status !== "aguardando" && (
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => reabrirAprovacao(aprovacao.id, projetoId))}
            className="text-[11px] text-[#968F88] hover:text-[#DDDBD9] underline underline-offset-2 disabled:opacity-40"
          >
            Pedir aprovação de novo
          </button>
        )}
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => excluirAprovacao(aprovacao.id, projetoId))}
          className="text-[11px] text-red-400 hover:text-red-300 underline underline-offset-2 disabled:opacity-40"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

function NovaAprovacao({ criar }: { criar: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(criar, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <Card>
      <p className="text-sm font-semibold text-[#F5F5F4] mb-1">Pedir aprovação</p>
      <p className="text-xs text-[#968F88] mb-4 max-w-prose">
        Aparece no portal com os botões de aprovar e pedir ajuste. O cliente escreve o nome dele ao responder, então
        fica registrado quem aprovou.
      </p>
      <form ref={ref} action={formAction} className="space-y-3">
        <Campo label="O que ele vai aprovar" htmlFor="titulo" hint="Ex.: Layout da página inicial">
          <Input id="titulo" name="titulo" placeholder="Layout da home" />
        </Campo>
        <Campo label="Link do material" htmlFor="link" hint="Figma, staging, PDF no Drive. Opcional.">
          <Input id="link" name="link" type="url" placeholder="https://" />
        </Campo>
        <Campo label="Recado" htmlFor="descricao" hint="O que você quer que ele olhe com atenção. Opcional.">
          <Textarea id="descricao" name="descricao" rows={3} placeholder="Confere os textos da seção de serviços…" />
        </Campo>
        <MensagemErro>{state.erro}</MensagemErro>
        <BotaoConfirmar type="submit" disabled={pending}>
          {pending ? "Criando…" : "Abrir pedido"}
        </BotaoConfirmar>
      </form>
    </Card>
  );
}
