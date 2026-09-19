"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { entrar, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <main className="flex flex-1 items-center justify-center bg-lavanda-900 px-4 py-10">
      <div className="w-full max-w-sm rounded-larger bg-branco p-8 shadow-padrao">
        <p className="text-xs uppercase tracking-[0.2em] text-rosa-600">May Lima</p>
        <h1 className="mt-1 text-3xl text-neutro-900">Gestão</h1>
        <p className="mt-2 text-sm text-neutro-500">Clientes, projetos e pagamentos em um só lugar.</p>

        <form action={action} className="mt-8 space-y-4">
          <Campo label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" />
          </Campo>
          <Campo label="Senha" htmlFor="senha">
            <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
          </Campo>

          <MensagemErro>{state.erro}</MensagemErro>

          <Botao type="submit" tamanho="medio" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Botao>
        </form>
      </div>
    </main>
  );
}
