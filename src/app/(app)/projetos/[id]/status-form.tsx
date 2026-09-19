"use client";

import { useRef, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { STATUS_PROJETO, STATUS_PROJETO_LABEL, type StatusProjeto } from "@/lib/constantes";

/** Dropdown de status direto na página: muda e salva na hora, sem formulário de edição. */
export function StatusForm({ status, action }: { status: StatusProjeto; action: (formData: FormData) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={(fd) => startTransition(() => action(fd))} className="flex items-center gap-2">
      <label htmlFor="status" className="rotulo">
        Status
      </label>
      <Select
        id="status"
        name="status"
        defaultValue={status}
        disabled={pending}
        className="w-auto min-w-48 border-rosa-600/60 font-medium text-texto"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {STATUS_PROJETO.map((s) => (
          <option key={s} value={s}>
            {STATUS_PROJETO_LABEL[s]}
          </option>
        ))}
      </Select>
      {pending && <span className="text-xs text-texto-mudo">salvando…</span>}
    </form>
  );
}
