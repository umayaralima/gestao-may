import { cn } from "@/lib/cn";
import { ETAPA_LEAD_LABEL, type EtapaLead } from "@/lib/constantes";
import { formatDate, hojeISO } from "@/lib/format";

const corEtapa: Record<EtapaLead, string> = {
  novo: "bg-lavanda-400/40 text-lavanda-50",
  em_contato: "bg-rosa-900 text-rosa-100",
  proposta_enviada: "bg-rosa-700 text-rosa-50",
  negociando: "bg-rosa-500 text-rosa-50",
  ganho: "bg-sucesso/20 text-[#5fe07a]",
  perdido: "bg-lavanda-400/30 text-lavanda-200",
};

export function BadgeEtapa({ etapa }: { etapa: EtapaLead }) {
  return (
    <span className={cn("inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-medium", corEtapa[etapa])}>
      {ETAPA_LEAD_LABEL[etapa]}
    </span>
  );
}

/** Follow-up atrasado e de hoje saltam aos olhos, no mesmo padrão de pagamento atrasado. */
export function FollowupTag({ data }: { data: string | null }) {
  if (!data) return null;
  const hoje = hojeISO();
  if (data < hoje)
    return <span className="rounded-[8px] bg-falha px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Follow-up atrasado</span>;
  if (data === hoje)
    return <span className="rounded-[8px] bg-alerta px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Follow-up hoje</span>;
  return <span className="text-[11px] text-texto-mudo">Follow-up {formatDate(data)}</span>;
}
