import { cn } from "@/lib/cn";

/** Card do wireframe: superfície lavanda-700, borda fina lavanda-400, radius 12px. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-[12px] border border-borda bg-superficie p-5", className)}>{children}</div>;
}

export function CardTitulo({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-sans text-base font-semibold not-italic text-texto">{children}</h3>
      {sub && <p className="text-xs text-texto-mudo">{sub}</p>}
    </div>
  );
}
