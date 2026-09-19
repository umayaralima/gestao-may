"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ETAPAS_LEAD, ETAPAS_PIPELINE, ORIGENS_CLIENTE, PRIORIDADES } from "@/lib/constantes";
import type { Lead } from "@/lib/types";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do contato."),
  empresa: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  whatsapp: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  email: z.preprocess(vazioParaNull, z.string().trim().email("E-mail inválido.").nullable()),
  instagram: z.preprocess(vazioParaNull, z.string().trim().transform((s) => s.replace(/^@/, "")).nullable()),
  origem: z.preprocess(vazioParaNull, z.enum(ORIGENS_CLIENTE).nullable()),
  servico_interesse: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable()),
  valor_estimado: z.preprocess(vazioParaNull, z.coerce.number().nonnegative("Valor inválido.").nullable()),
  etapa: z.enum(ETAPAS_LEAD).default("novo"),
  prioridade: z.enum(PRIORIDADES).default("media"),
  proximo_followup: z.preprocess(vazioParaNull, z.string().date().nullable()),
  nota_followup: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  observacoes: z.preprocess(vazioParaNull, z.string().trim().nullable()),
});

function revalidar(id?: string) {
  revalidatePath("/pipeline");
  revalidatePath("/");
  if (id) revalidatePath(`/pipeline/${id}`);
}

export async function criarLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert(parsed.data);
  if (error) return { erro: "Não foi possível salvar o negócio." };

  revalidar();
  return { ok: true };
}

export async function atualizarLead(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ ...parsed.data, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidar(id);
  return { ok: true };
}

/** Troca de etapa direto na página. Etapa é manual, sem automação. */
export async function mudarEtapaLead(id: string, formData: FormData) {
  const etapa = z.enum(ETAPAS_LEAD).safeParse(formData.get("etapa"));
  if (!etapa.success) return;
  await setEtapa(id, etapa.data);
}

/** Setas ← → do card do Pipeline. */
export async function moverLead(id: string, direcao: "prev" | "next") {
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("etapa").eq("id", id).single<{ etapa: Lead["etapa"] }>();
  if (!lead) return;
  const i = ETAPAS_PIPELINE.indexOf(lead.etapa);
  const j = direcao === "next" ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= ETAPAS_PIPELINE.length) return;
  await setEtapa(id, ETAPAS_PIPELINE[j]);
}

async function setEtapa(id: string, etapa: Lead["etapa"]) {
  const supabase = await createClient();
  const patch: Partial<Lead> = { etapa, atualizado_em: new Date().toISOString() };
  if (etapa !== "perdido") patch.motivo_perda = null;
  await supabase.from("leads").update(patch).eq("id", id);
  revalidar(id);
}

export async function salvarMotivoPerda(id: string, formData: FormData) {
  const motivo = z.preprocess(vazioParaNull, z.string().trim().nullable()).safeParse(formData.get("motivo_perda"));
  if (!motivo.success) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ motivo_perda: motivo.data }).eq("id", id);
  revalidar(id);
}

/**
 * Converter lead em cliente: cria o cliente com os dados do lead, marca como Fechado
 * e leva pra tela de novo projeto já com o cliente selecionado.
 */
export async function converterEmCliente(id: string) {
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single<Lead>();
  if (!lead) return;

  const { data: existente } = await supabase.from("clientes").select("id").eq("lead_id", id).maybeSingle<{ id: string }>();
  if (existente) redirect(`/clientes/${existente.id}`);

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert({
      nome: lead.nome,
      empresa: lead.empresa,
      email: lead.email,
      whatsapp: lead.whatsapp,
      origem: lead.origem,
      observacoes: [lead.instagram ? `Instagram: @${lead.instagram}` : null, lead.observacoes].filter(Boolean).join("\n") || null,
      lead_id: lead.id,
    })
    .select("id")
    .single();
  if (error || !cliente) return;

  await supabase.from("leads").update({ etapa: "ganho", proximo_followup: null, nota_followup: null, atualizado_em: new Date().toISOString() }).eq("id", id);

  revalidar(id);
  revalidatePath("/clientes");
  redirect(`/projetos?novo=1&cliente=${cliente.id}&servico=${encodeURIComponent(lead.servico_interesse ?? "")}&valor=${lead.valor_estimado ?? ""}`);
}

export async function excluirLead(id: string) {
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id);
  revalidar();
  redirect("/pipeline");
}
