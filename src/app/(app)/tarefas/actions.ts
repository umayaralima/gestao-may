"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PRIORIDADES } from "@/lib/constantes";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const tarefaSchema = z.object({
  titulo: z.string().trim().min(2, "Dê um título pra tarefa."),
  descricao: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  // "cliente:<uuid>" | "lead:<uuid>" | "projeto:<uuid>" | ""
  vinculo: z.string().optional(),
  categoria: z.string().trim().min(1).max(80).default("Outro"),
  prioridade: z.enum(PRIORIDADES).default("media"),
  vencimento: z.preprocess(vazioParaNull, z.string().date("Data inválida.").nullable()),
});

function separarVinculo(v?: string) {
  const nada = { cliente_id: null, lead_id: null, projeto_id: null };
  if (!v) return nada;
  const [tipo, id] = v.split(":");
  if (!id) return nada;
  if (tipo === "lead") return { ...nada, lead_id: id };
  if (tipo === "projeto") return { ...nada, projeto_id: id };
  return { ...nada, cliente_id: id };
}

function revalidar() {
  revalidatePath("/tarefas");
  revalidatePath("/projetos", "layout");
  revalidatePath("/");
}

export async function criarTarefa(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = tarefaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { vinculo, ...resto } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").insert({ ...resto, ...separarVinculo(vinculo) });
  if (error) return { erro: "Não foi possível criar a tarefa." };

  revalidar();
  return { ok: true };
}

export async function atualizarTarefa(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = tarefaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { vinculo, ...resto } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").update({ ...resto, ...separarVinculo(vinculo) }).eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidar();
  return { ok: true };
}

export async function alternarTarefa(id: string, concluida: boolean) {
  const supabase = await createClient();
  await supabase.from("tarefas").update({ concluida_em: concluida ? new Date().toISOString() : null }).eq("id", id);
  revalidar();
}

export async function excluirTarefa(id: string) {
  const supabase = await createClient();
  await supabase.from("tarefas").delete().eq("id", id);
  revalidar();
}

/** Arrastar/mover pra outro dia (visão semana/mês). */
export async function reagendarTarefa(id: string, vencimento: string | null) {
  const supabase = await createClient();
  await supabase.from("tarefas").update({ vencimento }).eq("id", id);
  revalidar();
}
