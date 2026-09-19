"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Campo, Input, MensagemErro } from "@/components/ui/primitivos";
import { entrar, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <main className="flex flex-1 items-center justify-center bg-[#150C1D] px-4 py-10">
      <div className="w-full max-w-sm bg-[#231431] border border-[#311C45] rounded-2xl p-8 entrar">
        <Image src="/marca/logo-gradiente.png" alt="Mayara" width={531} height={131} priority className="h-9 w-auto" />
        <h1 className="mt-6 text-2xl text-[#F5F5F4]">Entrar</h1>
        <p className="mt-1 text-xs text-[#968F88]">Clientes, pipeline, projetos e financeiro em um só lugar.</p>

        <form action={action} className="mt-6 space-y-4">
          <Campo label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" />
          </Campo>
          <Campo label="Senha" htmlFor="senha">
            <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
          </Campo>
          <MensagemErro>{state.erro}</MensagemErro>
          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
