"use client";

import { useRef, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Props = {
  name: string;
  label: string;
  value: string;
  opcoes: Array<{ valor: string; label: string }>;
  action: (formData: FormData) => Promise<void>;
  className?: string;
};

/** Select que salva ao trocar, sem botão: ação direta na página. */
export function SelectInline({ name, label, value, opcoes, action, className }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={(fd) => startTransition(() => action(fd))} className="flex items-center gap-2">
      <label htmlFor={name} className="text-xs uppercase tracking-wide text-neutro-500">
        {label}
      </label>
      <Select
        id={name}
        name={name}
        defaultValue={value}
        disabled={pending}
        className={cn("w-auto min-w-48 border-rosa-600 font-medium text-rosa-800", className)}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </Select>
      {pending && <span className="text-xs text-neutro-500">salvando…</span>}
    </form>
  );
}
