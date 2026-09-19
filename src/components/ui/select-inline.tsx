"use client";

import { useRef, useTransition } from "react";
import { cn } from "@/lib/cn";

type Props = {
  name: string;
  label?: string;
  value: string;
  opcoes: Array<{ valor: string; label: string }>;
  action: (formData: FormData) => Promise<void>;
  className?: string;
};

/** Select que salva ao trocar, sem botão: ação direta na página (status do projeto, etapa do lead). */
export function SelectInline({ name, label, value, opcoes, action, className }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={(fd) => startTransition(() => action(fd))} className="flex items-center gap-2">
      {label && <span className="text-xs text-[#968F88]">{label}:</span>}
      <select
        name={name}
        defaultValue={value}
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
        className={cn(
          "bg-[#231431] border border-brand-400/40 rounded-lg px-2.5 py-2 text-xs font-medium text-brand-400 outline-none focus:border-brand-400/60 cursor-pointer disabled:opacity-50",
          className,
        )}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-[10px] text-[#968F88]">salvando…</span>}
    </form>
  );
}
