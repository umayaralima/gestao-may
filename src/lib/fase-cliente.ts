import type { Projeto } from "@/lib/types";

/*
 * Fase do cliente calculada pelos projetos dele (nada manual):
 *   em_andamento  → tem projeto entre briefing e em revisão
 *   entregue      → nenhum em andamento, mas tem projeto entregue (falta concluir/receber)
 *   concluido     → todos os projetos concluídos (o "banco de clientes finalizados")
 *   sem_projeto   → ainda não tem projeto (ou só cancelados)
 * O status manual ativo/inativo continua existindo só pra arquivar.
 */
export const FASES_CLIENTE = ["em_andamento", "entregue", "concluido", "sem_projeto"] as const;
export type FaseCliente = (typeof FASES_CLIENTE)[number];

export const FASE_CLIENTE_LABEL: Record<FaseCliente, string> = {
  em_andamento: "Em andamento",
  entregue: "Entregue",
  concluido: "Concluído",
  sem_projeto: "Sem projeto",
};
export const FASE_CLIENTE_COR: Record<FaseCliente, string> = {
  em_andamento: "#C17AD2",
  entregue: "#FBBF24",
  concluido: "#34D399",
  sem_projeto: "#968F88",
};
export const FASE_CLIENTE_TOM: Record<FaseCliente, "brand" | "warning" | "success" | "muted"> = {
  em_andamento: "brand",
  entregue: "warning",
  concluido: "success",
  sem_projeto: "muted",
};

const EM_ANDAMENTO = new Set(["briefing", "orcamento_enviado", "aprovado", "em_desenvolvimento", "em_revisao"]);

export function faseCliente(projetos: Array<Pick<Projeto, "status">>): FaseCliente {
  const validos = projetos.filter((p) => p.status !== "cancelado");
  if (validos.some((p) => EM_ANDAMENTO.has(p.status))) return "em_andamento";
  if (validos.some((p) => p.status === "entregue")) return "entregue";
  if (validos.length > 0 && validos.every((p) => p.status === "concluido")) return "concluido";
  return "sem_projeto";
}
