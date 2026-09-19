"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/input";
import { MensagemErro } from "@/components/ui/pagina";
import { entrar, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <main className="flex flex-1 items-center justify-center bg-fundo px-4 py-10">
      <div className="w-full max-w-sm rounded-[16px] border border-borda bg-superficie p-8">
        <Image src="/marca/logo-gradiente.png" alt="Mayara" width={531} height={131} priority className="h-10 w-auto" />
        <h1 className="mt-6 text-3xl text-texto">Gestão</h1>
        <p className="mt-1 text-sm text-texto-mudo">Leads, clientes, projetos e pagamentos em um só lugar.</p>

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
