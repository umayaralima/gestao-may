import type { StatusProjeto } from "@/lib/constantes";
import type { Tarefa } from "@/lib/types";

/*
 * Portal do cliente. O que mora aqui é a TRADUÇÃO do sistema pro cliente:
 * ele não precisa saber que existe status "em_revisao" nem quando vence a etapa
 * interna — precisa saber em que pé está, o que falta dele e o que ele aprova.
 *
 * Roda no cliente também (a página pública importa daqui), então nada de
 * Supabase nem segredo neste arquivo.
 */

export type StatusAprovacao = "aguardando" | "aprovado" | "ajuste";

export type Aprovacao = {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  link: string | null;
  status: StatusAprovacao;
  comentario_cliente: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  criado_em: string;
};

export const STATUS_APROVACAO_LABEL: Record<StatusAprovacao, string> = {
  aguardando: "Aguardando o cliente",
  aprovado: "Aprovado",
  ajuste: "Ajuste pedido",
};

/*
 * A fase na linguagem do cliente. "Orçamento enviado" ele entende; "em_revisao"
 * não quer dizer nada pra quem não trabalha com isso.
 */
export const FASE_CLIENTE: Record<StatusProjeto, { rotulo: string; frase: string }> = {
  briefing: { rotulo: "Começando", frase: "Estamos levantando as informações do seu projeto." },
  orcamento_enviado: { rotulo: "Orçamento enviado", frase: "O orçamento está com você. Qualquer dúvida, me chame." },
  aprovado: { rotulo: "Aprovado", frase: "Projeto aprovado. Organizando o material pra começar a produção." },
  em_desenvolvimento: { rotulo: "Em produção", frase: "Seu projeto está sendo construído." },
  em_revisao: { rotulo: "Em revisão", frase: "Ajustes finais antes de publicar." },
  entregue: { rotulo: "Entregue", frase: "Seu projeto está no ar." },
  concluido: { rotulo: "Concluído", frase: "Projeto finalizado. Obrigada pela confiança!" },
  cancelado: { rotulo: "Encerrado", frase: "Este projeto foi encerrado." },
};

/** Projeto cancelado não abre portal: o link para de responder. */
export const PORTAL_FECHADO: StatusProjeto[] = ["cancelado"];

export type EtapaPortal = {
  id: string;
  titulo: string;
  estado: "feita" | "atual" | "proxima";
  concluidaEm: string | null;
};

/*
 * Etapas na visão do cliente: as feitas com data, a primeira pendente como
 * "atual" e o resto como "próxima" — SEM prazo.
 *
 * O prazo de cada etapa é planejamento interno e muda conforme o material chega.
 * Mostrar data por etapa transformaria o portal em cobrança ("você disse dia 12").
 * O cliente vê a data que importa, que é a entrega do projeto, no cabeçalho.
 */
export function etapasDoPortal(tarefas: Tarefa[]): EtapaPortal[] {
  const ordenadas = [...tarefas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  let achouAtual = false;

  return ordenadas.map((t) => {
    if (t.concluida_em) return { id: t.id, titulo: t.titulo, estado: "feita", concluidaEm: t.concluida_em };
    if (!achouAtual) {
      achouAtual = true;
      return { id: t.id, titulo: t.titulo, estado: "atual", concluidaEm: null };
    }
    return { id: t.id, titulo: t.titulo, estado: "proxima", concluidaEm: null };
  });
}

export function progressoEtapas(etapas: EtapaPortal[]) {
  const total = etapas.length;
  const feitas = etapas.filter((e) => e.estado === "feita").length;
  return { total, feitas, percentual: total ? Math.round((feitas / total) * 100) : 0 };
}

/** O que trava o projeto do lado do cliente — é o bloco que ele precisa ver primeiro. */
export function pendenciasDoCliente({
  aprovacoes,
  briefingPendente,
}: {
  aprovacoes: Aprovacao[];
  briefingPendente: boolean;
}) {
  const lista: string[] = [];
  const aguardando = aprovacoes.filter((a) => a.status === "aguardando").length;
  if (aguardando) lista.push(aguardando === 1 ? "1 aprovação aguardando você" : `${aguardando} aprovações aguardando você`);
  if (briefingPendente) lista.push("briefing ainda não enviado");
  return lista;
}
