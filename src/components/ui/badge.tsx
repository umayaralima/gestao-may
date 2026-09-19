import { cn } from "@/lib/cn";
import type { StatusProjeto } from "@/lib/constantes";
import { STATUS_PROJETO_LABEL } from "@/lib/constantes";
import type { StatusPagamento } from "@/lib/types";

const base = "inline-flex items-center rounded-smaller px-2 py-0.5 text-xs font-medium";

const corProjeto: Record<StatusProjeto, string> = {
  briefing: "bg-neutro-100 text-neutro-700",
  orcamento_enviado: "bg-rosa-100 text-rosa-800",
  aprovado: "bg-rosa-200 text-rosa-900",
  em_desenvolvimento: "bg-rosa-600 text-rosa-50",
  em_revisao: "bg-lavanda-400 text-lavanda-50",
  entregue: "bg-lavanda-600 text-lavanda-50",
  concluido: "bg-sucesso/15 text-sucesso",
  cancelado: "bg-neutro-200 text-neutro-600 line-through",
};

export function BadgeProjeto({ status }: { status: StatusProjeto }) {
  return <span className={cn(base, corProjeto[status])}>{STATUS_PROJETO_LABEL[status]}</span>;
}

/*
 * Atrasado tem que saltar aos olhos (regra da spec): fundo sólido vermelho,
 * texto branco, não é só um tom discreto.
 */
const corPagamento: Record<StatusPagamento, string> = {
  pendente: "bg-alerta/15 text-[#9a5c00]",
  pago: "bg-sucesso/15 text-sucesso",
  atrasado: "bg-falha text-white font-semibold uppercase tracking-wide",
};

const labelPagamento: Record<StatusPagamento, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

export function BadgePagamento({ status }: { status: StatusPagamento }) {
  return <span className={cn(base, corPagamento[status])}>{labelPagamento[status]}</span>;
}

export function BadgeCliente({ status }: { status: "ativo" | "inativo" }) {
  return (
    <span className={cn(base, status === "ativo" ? "bg-sucesso/15 text-sucesso" : "bg-neutro-100 text-neutro-600")}>
      {status === "ativo" ? "Ativo" : "Inativo"}
    </span>
  );
}
