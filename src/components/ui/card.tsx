import { cn } from "@/lib/cn";

/** Card: fundo branco, radius-medium (8px), sombra-padrao do guia. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-medium bg-branco p-5 shadow-padrao", className)}>{children}</div>;
}

export function CardTitulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-lg text-neutro-900">{children}</h3>;
}
