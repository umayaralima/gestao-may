import type { StatusProjeto } from "@/lib/constantes";

export function tomStatus(s: StatusProjeto): "success" | "warning" | "error" | "info" | "brand" | "muted" {
  if (s === "concluido") return "success";
  if (s === "cancelado") return "muted";
  if (s === "briefing" || s === "orcamento_enviado") return "info";
  if (s === "em_revisao" || s === "entregue") return "warning";
  return "brand";
}
