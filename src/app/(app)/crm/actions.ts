"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CANAIS_INTERACAO } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";

/*
 * Ações compartilhadas do CRM: interações e follow-up.
 * Funcionam tanto pra lead quanto pra cliente ("dono").
 */

export type Dono = { tipo: "lead" | "cliente"; id: string };
export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

function caminho(dono: Dono) {
  return dono.tipo === "lead" ? `/leads/${dono.id}` : `/clientes/${dono.id}`;
}

function revalidar(dono: Dono) {
  revalidatePath(caminho(dono));
  revalidatePath("/leads");
  revalidatePath("/");
}

const interacaoSchema = z.object({
  data: z.string().date("Informe a data."),
  canal: z.preprocess(vazioParaNull, z.enum(CANAIS_INTERACAO).nullable()),
  resumo: z.string().trim().min(2, "Escreva um resumo da conversa."),
});

export async function registrarInteracao(dono: Dono, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = interacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("interacoes").insert({
    ...parsed.data,
    lead_id: dono.tipo === "lead" ? dono.id : null,
    cliente_id: dono.tipo === "cliente" ? dono.id : null,
  });
  if (error) return { erro: "Não foi possível registrar." };

  // Registrar contato de um lead "novo" já o move pra "em contato" (única automação, e é reversível no dropdown)
  if (dono.tipo === "lead") {
    await supabase.from("leads").update({ atualizado_em: new Date().toISOString() }).eq("id", dono.id).eq("etapa", "novo");
    await supabase.from("leads").update({ etapa: "em_contato" }).eq("id", dono.id).eq("etapa", "novo");
  }

  revalidar(dono);
  return { ok: true };
}

export async function excluirInteracao(dono: Dono, id: string) {
  const supabase = await createClient();
  await supabase.from("interacoes").delete().eq("id", id);
  revalidar(dono);
}

const followupSchema = z.object({
  proximo_followup: z.preprocess(vazioParaNull, z.string().date("Data inválida.").nullable()),
  nota_followup: z.preprocess(vazioParaNull, z.string().trim().nullable()),
});

export async function salvarFollowup(dono: Dono, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = followupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const tabela = dono.tipo === "lead" ? "leads" : "clientes";
  const { error } = await supabase.from(tabela).update(parsed.data).eq("id", dono.id);
  if (error) return { erro: "Não foi possível salvar o follow-up." };

  revalidar(dono);
  return { ok: true };
}

/** "Feito": limpa o follow-up atual. A pessoa registra a interação e agenda o próximo se quiser. */
export async function concluirFollowup(dono: Dono) {
  const supabase = await createClient();
  const tabela = dono.tipo === "lead" ? "leads" : "clientes";
  await supabase.from(tabela).update({ proximo_followup: null, nota_followup: null }).eq("id", dono.id);
  revalidar(dono);
}

export async function adiarFollowup(dono: Dono, dias: number) {
  const d = new Date(`${hojeISO()}T00:00:00`);
  d.setDate(d.getDate() + dias);
  const pad = (n: number) => String(n).padStart(2, "0");
  const nova = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const supabase = await createClient();
  const tabela = dono.tipo === "lead" ? "leads" : "clientes";
  await supabase.from(tabela).update({ proximo_followup: nova }).eq("id", dono.id);
  revalidar(dono);
}
