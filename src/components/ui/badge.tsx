import { cn } from "@/lib/cn";
import type { StatusProjeto } from "@/lib/constantes";
import { STATUS_PROJETO_LABEL } from "@/lib/constantes";
import type { StatusPagamento } from "@/lib/types";

const base = "inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-medium";

const corProjeto: Record<StatusProjeto, string> = {
  briefing: "bg-lavanda-400/40 text-lavanda-50",
  orcamento_enviado: "bg-rosa-900 text-rosa-100",
  aprovado: "bg-rosa-800 text-rosa-50",
  em_desenvolvimento: "bg-rosa-600 text-rosa-50",
  em_revisao: "bg-rosa-400 text-lavanda-900",
  entregue: "bg-rosa-200 text-lavanda-900",
  concluido: "bg-sucesso/20 text-[#5fe07a]",
  cancelado: "bg-lavanda-400/30 text-lavanda-200 line-through",
};

export function BadgeProjeto({ status }: { status: StatusProjeto }) {
  return <span className={cn(base, corProjeto[status])}>{STATUS_PROJETO_LABEL[status]}</span>;
}

/*
 * Atrasado tem que saltar aos olhos (regra da spec): fundo sólido vermelho,
 * texto branco, não é só um tom discreto.
 */
const corPagamento: Record<StatusPagamento, string> = {
  pendente: "bg-alerta/20 text-[#ffc266]",
  pago: "bg-sucesso/20 text-[#5fe07a]",
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
    <span className={cn(base, status === "ativo" ? "bg-sucesso/20 text-[#5fe07a]" : "bg-lavanda-400/30 text-lavanda-200")}>
      {status === "ativo" ? "Ativo" : "Inativo"}
    </span>
  );
}
