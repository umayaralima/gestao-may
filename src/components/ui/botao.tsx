import Link from "next/link";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "terciario" | "perigo";
type Tamanho = "pequeno" | "medio";

/*
 * Botão do guia "May", em escala de UI:
 *  - primario: rosa-600 sólido (wireframe escuro), hover rosa-700, active rosa-900
 *  - secundario: superfície lavanda com borda; hover borda rosa-600
 *  - terciario: link sublinhado rosa-300 (legível no fundo escuro)
 *  - perigo: variante extra pra ações destrutivas (não existe no guia; usa `falha`)
 */
const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosa-600";

const variantes: Record<Variante, string> = {
  primario:
    "bg-rosa-600 text-rosa-50 hover:bg-rosa-700 active:bg-rosa-900",
  secundario:
    "border border-borda-forte bg-superficie-2 text-texto hover:border-rosa-600 hover:bg-superficie-hover active:bg-rosa-900",
  terciario:
    "text-rosa-300 underline underline-offset-4 hover:text-rosa-200 active:text-rosa-400 px-0",
  perigo:
    "border border-falha/50 text-[#ff8a8a] bg-transparent hover:bg-falha hover:text-white active:opacity-80",
};

const tamanhos: Record<Tamanho, string> = {
  pequeno: "text-sm px-4 py-2",
  medio: "text-base px-6 py-3",
};

type BaseProps = {
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = BaseProps & { href: string };

export function Botao(props: ButtonProps | AnchorProps) {
  const { variante = "primario", tamanho = "pequeno", className, children } = props;
  const classes = cn(base, variantes[variante], variante === "terciario" ? "" : tamanhos[tamanho], className);

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variante: _v, tamanho: _t, className: _c, children: _ch, href: _h, ...rest } = props as ButtonProps;
  return (
    <button type="button" {...rest} className={classes}>
      {children}
    </button>
  );
}
