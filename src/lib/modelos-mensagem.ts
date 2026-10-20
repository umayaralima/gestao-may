import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ModeloMensagem, Situacao } from "@/lib/mensagem";

/*
 * Leitura dos modelos de mensagem (server). Separado de `mensagem.ts` porque
 * aquele arquivo também roda no cliente — aqui mora o que toca o banco.
 *
 * Em cache por request: a tela do projeto, por exemplo, pode pedir os modelos
 * em dois lugares sem pagar duas consultas.
 */

export const getModelosMensagem = cache(async function getModelosMensagem(): Promise<ModeloMensagem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modelos_mensagem")
    .select("*")
    .order("situacao")
    .order("ordem")
    .returns<ModeloMensagem[]>();
  return data ?? [];
});

/** Só os ativos de uma situação — é o que as telas entregam pro BotaoMensagem. */
export async function modelosDaSituacao(situacao: Situacao | Situacao[]): Promise<ModeloMensagem[]> {
  const quais = Array.isArray(situacao) ? situacao : [situacao];
  const todos = await getModelosMensagem();
  return todos.filter((m) => m.ativo && quais.includes(m.situacao));
}
