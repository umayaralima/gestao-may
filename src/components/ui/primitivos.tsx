import Link from "next/link";
import { cn } from "@/lib/cn";

/*
 * Primitivos visuais copiados do protótipo do Figma Make (classes iguais às do código exportado).
 * Cores literais (#231431, #311C45, #968F88…) são os tokens lavanda/warm do guia; mantidas
 * literais aqui pra bater 1:1 com o protótipo.
 */

/** Cabeçalho de tela: título serifado + subtítulo + ações à direita. */
export function Header({
  titulo,
  sub,
  children,
  className,
}: {
  titulo: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center justify-between px-6 py-4 border-b border-[#311C45] shrink-0 gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-[#F5F5F4]">{titulo}</h1>
        {sub && <p className="text-xs text-[#968F88]">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </header>
  );
}

/** Barra secundária abaixo do header (filtros, contadores). */
export function Subbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-3 px-6 py-3 border-b border-[#311C45] shrink-0", className)}>{children}</div>;
}

/** Área rolável do conteúdo. */
export function Conteudo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-y-auto", className)}>{children}</div>;
}

/** Tela inteira: coluna com header + conteúdo, ocupa a altura do main. */
export function Tela({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-[#231431] border border-[#311C45] rounded-xl p-5", className)}>{children}</div>;
}

export function CardTitulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#F5F5F4]">{children}</p>
      {sub && <p className="text-xs text-[#968F88] mt-0.5">{sub}</p>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
  trend,
  trendUp,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  trend?: string;
  trendUp?: boolean;
  href?: string;
}) {
  const conteudo = (
    <div className={cn("bg-[#231431] border border-[#311C45] rounded-xl p-5 flex flex-col gap-3 h-full", href && "hover:border-[#5A496A] transition-colors")}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#968F88]">{label}</p>
      <div>
        <p className={cn("text-2xl font-semibold font-mono tracking-tight", accent ?? "text-[#F5F5F4]")}>{value}</p>
        {sub && <p className="text-xs text-[#968F88] mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className={cn("inline-flex items-center gap-1 text-xs font-medium", trendUp ? "text-emerald-400" : "text-red-400")}>
          <span>{trendUp ? "↑" : "↓"}</span>
          {trend}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}

/** Botão primário do protótipo (brand-400, texto branco, ícone + opcional). */
export function BotaoPrimario({
  children,
  href,
  icone = true,
  className,
  ...rest
}: { children: React.ReactNode; href?: string; icone?: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "flex items-center gap-2 px-3 py-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap",
    className,
  );
  const mais = icone && (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
  if (href)
    return (
      <Link href={href} className={classes}>
        {mais}
        {children}
      </Link>
    );
  return (
    <button type="button" {...rest} className={classes}>
      {mais}
      {children}
    </button>
  );
}

/** Botão secundário/ghost do protótipo (borda #311C45, texto muted). */
export function BotaoGhost({
  children,
  href,
  className,
  ...rest
}: { children: React.ReactNode; href?: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "px-3 py-2 text-xs text-[#968F88] border border-[#311C45] hover:border-[#5A496A] hover:text-[#DDDBD9] rounded-lg transition-colors whitespace-nowrap disabled:opacity-40",
    className,
  );
  if (href)
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  return (
    <button type="button" {...rest} className={classes}>
      {children}
    </button>
  );
}

/** Botãozinho de linha ("Abrir", "Ver"). */
export function BotaoLinha({ children, href, className, ...rest }: { children: React.ReactNode; href?: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "px-2.5 py-1 text-[11px] text-[#968F88] hover:text-brand-400 border border-[#311C45] hover:border-brand-400/30 rounded-lg transition-colors whitespace-nowrap",
    className,
  );
  if (href)
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  return (
    <button type="button" {...rest} className={classes}>
      {children}
    </button>
  );
}

/** Pílula de status com pontinho. */
export function Pill({ tom, children, dot = true }: { tom: "success" | "warning" | "error" | "info" | "brand" | "muted"; children: React.ReactNode; dot?: boolean }) {
  const map = {
    success: ["bg-emerald-500/10 border border-emerald-500/20 text-emerald-400", "bg-emerald-400"],
    warning: ["bg-amber-500/10 border border-amber-500/20 text-amber-400", "bg-amber-400"],
    error: ["bg-red-500/10 border border-red-500/20 text-red-400", "bg-red-400"],
    info: ["bg-sky-500/10 border border-sky-500/20 text-sky-400", "bg-sky-400"],
    brand: ["bg-brand-400/12 border border-brand-400/20 text-brand-400", "bg-brand-400"],
    muted: ["bg-white/5 border border-[#5A496A] text-[#968F88]", "bg-[#968F88]"],
  } as const;
  const [cls, dotCls] = map[tom];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", cls)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotCls)} />}
      {children}
    </span>
  );
}

/** Avatar de iniciais com cor derivada do nome (estilo dos cards do protótipo). */
const PALETA = ["#B159C7", "#C17AD2", "#A151B5", "#34D399", "#FBBF24", "#60A5FA", "#FB923C", "#F472B6", "#38BDF8"];
export function corDoNome(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}
export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? p[0]?.[1] ?? "")).toUpperCase();
}
export function Avatar({ nome, tamanho = 8, className }: { nome: string; tamanho?: 7 | 8 | 11; className?: string }) {
  const cor = corDoNome(nome);
  const dim = { 7: "w-7 h-7 rounded-lg text-[10px]", 8: "w-8 h-8 rounded-lg text-[11px]", 11: "w-11 h-11 rounded-xl text-sm" }[tamanho];
  return (
    <div
      className={cn("flex items-center justify-center font-bold shrink-0", dim, className)}
      style={{ background: `linear-gradient(135deg, ${cor}30, ${cor}18)`, border: `1px solid ${cor}35`, color: cor }}
    >
      {iniciais(nome)}
    </div>
  );
}

/** Campo de busca do header. */
export function Busca({ placeholder, defaultValue, name = "q", className }: { placeholder: string; defaultValue?: string; name?: string; className?: string }) {
  return (
    <form className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#968F88]" width="12" height="12" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={cn(
          "bg-[#231431] border border-[#311C45] rounded-lg pl-8 pr-3 py-2 text-xs text-[#DDDBD9] placeholder:text-[#968F88] outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 transition-all w-56",
          className,
        )}
      />
    </form>
  );
}

/** Estado vazio centralizado. */
export function Vazio({ icone = "🔍", titulo, sub }: { icone?: string; titulo: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-[#231431] border border-[#311C45] flex items-center justify-center text-xl mb-3">{icone}</div>
      <p className="text-sm font-medium text-[#DDDBD9]">{titulo}</p>
      {sub && <p className="text-xs text-[#968F88] mt-1">{sub}</p>}
    </div>
  );
}

/* Tabela do protótipo */
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#968F88]", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 text-xs text-[#C5C2BE] align-middle", className)}>{children}</td>;
}
export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-b border-[#311C45]/60 hover:bg-white/[0.02] transition-colors", className)}>{children}</tr>;
}

/* Formulários */
export const campoCls =
  "w-full bg-[#150C1D] border border-[#311C45] rounded-lg px-3 py-2.5 text-sm text-[#DDDBD9] placeholder:text-[#968F88] outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 transition-all disabled:opacity-40";

export function Rotulo({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] block mb-1.5">
      {children}
    </label>
  );
}
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(campoCls, className)} />;
}
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(campoCls, "resize-none", className)} />;
}
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(campoCls, "cursor-pointer", className)}>
      {children}
    </select>
  );
}
export function Campo({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Rotulo htmlFor={htmlFor}>{label}</Rotulo>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#968F88]">{hint}</p>}
    </div>
  );
}
export function MensagemErro({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
      {children}
    </p>
  );
}
