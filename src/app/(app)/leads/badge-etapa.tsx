import { cn } from "@/lib/cn";
import { ETAPA_LEAD_LABEL, type EtapaLead } from "@/lib/constantes";
import { formatDate, hojeISO } from "@/lib/format";

const corEtapa: Record<EtapaLead, string> = {
  novo: "bg-neutro-100 text-neutro-700",
  em_contato: "bg-rosa-100 text-rosa-800",
  proposta_enviada: "bg-rosa-300 text-rosa-900",
  negociando: "bg-rosa-600 text-rosa-50",
  ganho: "bg-sucesso/15 text-sucesso",
  perdido: "bg-neutro-200 text-neutro-600",
};

export function BadgeEtapa({ etapa }: { etapa: EtapaLead }) {
  return (
    <span className={cn("inline-flex rounded-smaller px-2 py-0.5 text-xs font-medium", corEtapa[etapa])}>
      {ETAPA_LEAD_LABEL[etapa]}
    </span>
  );
}

/** Follow-up atrasado e de hoje saltam aos olhos, no mesmo padrão de pagamento atrasado. */
export function FollowupTag({ data }: { data: string | null }) {
  if (!data) return null;
  const hoje = hojeISO();
  if (data < hoje)
    return <span className="rounded-smaller bg-falha px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Follow-up atrasado</span>;
  if (data === hoje)
    return <span className="rounded-smaller bg-alerta px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Follow-up hoje</span>;
  return <span className="text-[11px] text-neutro-500">Follow-up {formatDate(data)}</span>;
}
