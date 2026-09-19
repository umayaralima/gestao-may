import { Pill } from "@/components/ui/primitivos";

export function BadgeStatusCliente({ status }: { status: "ativo" | "inativo" }) {
  return status === "ativo" ? <Pill tom="success">Ativo</Pill> : <Pill tom="muted">Inativo</Pill>;
}
