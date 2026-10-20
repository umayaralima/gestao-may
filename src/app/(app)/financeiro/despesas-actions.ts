"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO, PERIODICIDADES } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

function revalidar() {
  revalidatePath("/financeiro");
  revalidatePath("/relatorios");
  revalidatePath("/");
}

const despesaSchema = z
  .object({
    descricao: z.string().trim().min(2, "Descreva a despesa.").max(160),
    categoria: z.string().trim().min(1).max(80),
    valor: z
      .string()
      .trim()
      .transform((v) => Number(v.replace(/\./g, "").replace(",", ".")))
      .refine((v) => Number.isFinite(v) && v > 0, "Informe um valor válido."),
    data: z.string().date("Data inválida."),
    pago: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    forma_pagamento: z.preprocess(vazioParaNull, z.enum(FORMAS_PAGAMENTO).nullable()),
    fornecedor: z.preprocess(vazioParaNull, z.string().trim().max(120).nullable()),
    projeto_id: z.preprocess(vazioParaNull, z.string().uuid().nullable()),
    recorrente: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    periodicidade: z.preprocess(vazioParaNull, z.enum(PERIODICIDADES).nullable()),
    recorrencia_ate: z.preprocess(vazioParaNull, z.string().date().nullable()),
    observacoes: z.preprocess(vazioParaNull, z.string().trim().max(1000).nullable()),
  })
  .refine((d) => !d.recorrente || d.periodicidade, { message: "Escolha a periodicidade da despesa recorrente.", path: ["periodicidade"] });

export async function criarDespesa(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = despesaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { pago, ...d } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("despesas").insert({ ...d, pago_em: pago ? d.data : null });
  if (error) return { erro: error.code === "42P01" ? "Rode a migração 016_despesas.sql no Supabase." : "Não foi possível salvar." };

  revalidar();
  return { ok: true };
}

export async function atualizarDespesa(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = despesaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const { pago, ...d } = parsed.data;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("despesas").select("pago_em").eq("id", id).single<{ pago_em: string | null }>();
  const { error } = await supabase
    .from("despesas")
    .update({ ...d, pago_em: pago ? (atual?.pago_em ?? d.data) : null })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidar();
  return { ok: true };
}

export async function alternarPagamentoDespesa(id: string, pago: boolean) {
  const supabase = await createClient();
  await supabase.from("despesas").update({ pago_em: pago ? hojeISO() : null }).eq("id", id);
  revalidar();
}

export async function excluirDespesa(id: string) {
  const supabase = await createClient();
  await supabase.from("despesas").delete().eq("id", id);
  revalidar();
}

/* ---------- Categorias de despesa (Configurações → Listas) ---------- */

export async function criarCategoriaDespesa(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ nome: z.string().trim().min(2, "Informe o nome.").max(80), icone: z.string().trim().max(8).transform((v) => v || "•") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: ultima } = await supabase.from("categorias_despesa").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle<{ ordem: number }>();
  const { error } = await supabase.from("categorias_despesa").insert({ ...parsed.data, ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível salvar." };

  revalidatePath("/configuracoes");
  revalidar();
  return { ok: true };
}

export async function atualizarCategoriaDespesa(id: string, formData: FormData) {
  const parsed = z
    .object({ nome: z.string().trim().min(2).max(80), icone: z.string().trim().max(8).transform((v) => v || "•") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("categorias_despesa").select("nome").eq("id", id).single<{ nome: string }>();
  if (!atual) return;

  await supabase.from("categorias_despesa").update(parsed.data).eq("id", id);
  if (atual.nome !== parsed.data.nome) await supabase.from("despesas").update({ categoria: parsed.data.nome }).eq("categoria", atual.nome);
  revalidatePath("/configuracoes");
  revalidar();
}

export async function excluirCategoriaDespesa(id: string) {
  const supabase = await createClient();
  await supabase.from("categorias_despesa").delete().eq("id", id);
  revalidatePath("/configuracoes");
}
