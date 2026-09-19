import { cn } from "@/lib/cn";

export function Tabela({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-[12px] border border-borda bg-superficie", className)}>
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-borda">{children}</thead>;
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("rotulo px-4 py-3", className)}>{children}</th>;
}

export function Tr({
  children,
  className,
  destaque,
}: {
  children: React.ReactNode;
  className?: string;
  destaque?: boolean;
}) {
  return (
    <tr className={cn("border-b border-borda/60 last:border-0 hover:bg-superficie-2/60", destaque && "bg-falha/10", className)}>
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-texto-suave", className)}>{children}</td>;
}
