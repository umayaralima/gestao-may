"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { erro?: string; ok?: boolean };

function revalidar() {
  revalidatePath("/configuracoes");
  revalidatePath("/projetos/novo");
}

export async function criarTipoProjeto(_prev: FormState, formData: FormData): Promise<FormState> {
  const nome = z.string().trim().min(2, "Informe o nome do serviço.").max(80).safeParse(formData.get("nome"));
  if (!nome.success) return { erro: nome.error.issues[0].message };

  const supabase = await createClient();
  const { data: ultimo } = await supabase
    .from("tipos_projeto")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();

  const { error } = await supabase.from("tipos_projeto").insert({ nome: nome.data, ordem: (ultimo?.ordem ?? 0) + 1 });
  if (error) return { erro: error.code === "23505" ? "Já existe um serviço com esse nome." : "Não foi possível salvar." };

  revalidar();
  return { ok: true };
}

export async function renomearTipoProjeto(id: string, formData: FormData) {
  const nome = z.string().trim().min(2).max(80).safeParse(formData.get("nome"));
  if (!nome.success) return;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("tipos_projeto").select("nome").eq("id", id).single<{ nome: string }>();
  if (!atual || atual.nome === nome.data) return;

  const { error } = await supabase.from("tipos_projeto").update({ nome: nome.data }).eq("id", id);
  if (error) return;

  // Projetos guardam o nome em texto: propaga o rename pra não ficarem órfãos.
  await supabase.from("projetos").update({ tipo: nome.data }).eq("tipo", atual.nome);

  revalidar();
  revalidatePath("/projetos");
}

export async function excluirTipoProjeto(id: string) {
  const supabase = await createClient();
  await supabase.from("tipos_projeto").delete().eq("id", id);
  revalidar();
}
