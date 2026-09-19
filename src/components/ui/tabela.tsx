import { cn } from "@/lib/cn";

export function Tabela({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-medium bg-branco shadow-padrao", className)}>
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-neutro-100 text-xs uppercase tracking-wide text-neutro-500">{children}</thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
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
    <tr className={cn("border-b border-neutro-0 last:border-0 hover:bg-neutro-0/70", destaque && "bg-falha/5", className)}>
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-neutro-800", className)}>{children}</td>;
}
