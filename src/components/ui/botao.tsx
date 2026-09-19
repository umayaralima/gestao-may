import Link from "next/link";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "terciario" | "perigo";
type Tamanho = "pequeno" | "medio";

/*
 * Botão do guia "May", em escala de UI:
 *  - primario: gradiente rosa-600→rosa-400, texto rosa-50, hover rosa-700, active rosa-900
 *  - secundario: borda rosa-600, texto rosa-800; hover preenche rosa-600
 *  - terciario: link sublinhado rosa-600 → rosa-700 → rosa-900
 *  - perigo: variante extra pra ações destrutivas (não existe no guia; usa `falha`)
 */
const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-smaller font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosa-600";

const variantes: Record<Variante, string> = {
  primario:
    "text-rosa-50 [background:var(--gradiente-botao-primario)] hover:[background:var(--rosa-700)] active:[background:var(--rosa-900)]",
  secundario:
    "border border-rosa-600 text-rosa-800 bg-transparent hover:bg-rosa-600 hover:border-rosa-700 hover:text-rosa-50 active:bg-rosa-700 active:border-rosa-900",
  terciario:
    "text-rosa-600 underline underline-offset-4 hover:text-rosa-700 active:text-rosa-900 px-0",
  perigo:
    "border border-falha text-falha bg-transparent hover:bg-falha hover:text-white active:opacity-80",
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
