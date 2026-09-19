"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STATUS_PROJETO } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const projetoSchema = z
  .object({
    cliente_id: z.string().uuid("Selecione o cliente."),
    nome: z.string().trim().min(2, "Informe o nome do projeto."),
    tipo: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable()),
    status: z.enum(STATUS_PROJETO).default("briefing"),
    valor_total: z.preprocess(vazioParaNull, z.coerce.number().nonnegative("Valor inválido.").nullable()),
    data_inicio: z.preprocess(vazioParaNull, z.string().date().nullable()),
    prazo_entrega: z.preprocess(vazioParaNull, z.string().date().nullable()),
    link_projeto: z.preprocess(vazioParaNull, z.string().trim().url("Link inválido (inclua https://).").nullable()),
    observacoes: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  })
  .refine((d) => !d.data_inicio || !d.prazo_entrega || d.prazo_entrega >= d.data_inicio, {
    message: "O prazo de entrega não pode ser antes da data de início.",
  });

function revalidar(id?: string, clienteId?: string) {
  revalidatePath("/projetos");
  revalidatePath("/");
  revalidatePath("/clientes");
  if (id) revalidatePath(`/projetos/${id}`);
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

export async function criarProjeto(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projetoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").insert(parsed.data).select("id").single();
  if (error) return { erro: "Não foi possível salvar o projeto." };

  revalidar(undefined, parsed.data.cliente_id);
  redirect(`/projetos/${data.id}`);
}

export async function atualizarProjeto(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projetoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("projetos").update(parsed.data).eq("id", id);
  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidar(id, parsed.data.cliente_id);
  return { ok: true };
}

/** Troca de status direto na página (regra: status é manual, ação direta). */
export async function mudarStatusProjeto(id: string, formData: FormData) {
  const status = z.enum(STATUS_PROJETO).safeParse(formData.get("status"));
  if (!status.success) return;
  const supabase = await createClient();
  await supabase.from("projetos").update({ status: status.data }).eq("id", id);
  revalidar(id);
}

export async function excluirProjeto(id: string, clienteId: string) {
  const supabase = await createClient();
  await supabase.from("projetos").delete().eq("id", id);
  revalidar(undefined, clienteId);
  revalidatePath("/financeiro");
  redirect(`/clientes/${clienteId}`);
}

// ---------- Briefing ----------
const briefingSchema = z.object({
  objetivo: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  publico_alvo: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  referencias: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  tem_identidade_visual: checkbox,
  cores_preferidas: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  conteudo_disponivel: checkbox,
  funcionalidades: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  concorrentes: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  orcamento_aproximado: z.preprocess(vazioParaNull, z.coerce.number().nonnegative("Orçamento inválido.").nullable()),
});

/** Um briefing por projeto: upsert em projeto_id. */
export async function salvarBriefing(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = briefingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("briefings").upsert({ projeto_id: projetoId, ...parsed.data }, { onConflict: "projeto_id" });
  if (error) return { erro: "Não foi possível salvar o briefing." };

  revalidar(projetoId);
  return { ok: true };
}

// ---------- Contratos ----------
export async function criarContrato(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const link = z.preprocess(vazioParaNull, z.string().trim().url("Link inválido (inclua https://).").nullable()).safeParse(formData.get("link_documento"));
  if (!link.success) return { erro: link.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("contratos").insert({ projeto_id: projetoId, link_documento: link.data });
  if (error) return { erro: "Não foi possível criar o contrato." };

  revalidar(projetoId);
  return { ok: true };
}

export async function atualizarLinkContrato(id: string, projetoId: string, formData: FormData) {
  const link = z.preprocess(vazioParaNull, z.string().trim().url().nullable()).safeParse(formData.get("link_documento"));
  if (!link.success) return;
  const supabase = await createClient();
  await supabase.from("contratos").update({ link_documento: link.data }).eq("id", id);
  revalidar(projetoId);
}

export async function marcarEnviado(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("contratos").update({ status: "enviado", data_envio: hojeISO() }).eq("id", id);
  revalidar(projetoId);
}

/** Marcar como assinado registra a data de hoje. Não muda o status do projeto: a página sugere. */
export async function marcarAssinado(id: string, projetoId: string) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const { data: atual } = await supabase.from("contratos").select("data_envio").eq("id", id).single<{ data_envio: string | null }>();
  await supabase.from("contratos").update({ status: "assinado", data_assinatura: hoje, data_envio: atual?.data_envio ?? hoje }).eq("id", id);
  revalidar(projetoId);
}

export async function voltarParaRascunho(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("contratos").update({ status: "rascunho", data_envio: null, data_assinatura: null }).eq("id", id);
  revalidar(projetoId);
}

export async function excluirContrato(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("contratos").delete().eq("id", id);
  revalidar(projetoId);
}

/** Aceite da sugestão "contrato assinado → projeto aprovado". */
export async function aprovarProjeto(projetoId: string) {
  const supabase = await createClient();
  await supabase.from("projetos").update({ status: "aprovado" }).eq("id", projetoId);
  revalidar(projetoId);
}
