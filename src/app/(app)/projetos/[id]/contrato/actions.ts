"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

function revalidar(projetoId: string) {
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/");
}

export async function criarContrato(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const link = z
    .preprocess(vazioParaNull, z.string().trim().url("Link inválido (inclua https://).").nullable())
    .safeParse(formData.get("link_documento"));
  if (!link.success) return { erro: link.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("contratos").insert({ projeto_id: projetoId, link_documento: link.data });
  if (error) return { erro: "Não foi possível criar o contrato." };

  revalidar(projetoId);
  return { ok: true };
}

export async function atualizarLinkContrato(id: string, projetoId: string, formData: FormData) {
  const link = z
    .preprocess(vazioParaNull, z.string().trim().url().nullable())
    .safeParse(formData.get("link_documento"));
  if (!link.success) return;

  const supabase = await createClient();
  await supabase.from("contratos").update({ link_documento: link.data }).eq("id", id);
  revalidar(projetoId);
}

/** Marcar como enviado registra a data de hoje. */
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
  await supabase
    .from("contratos")
    .update({ status: "assinado", data_assinatura: hoje, data_envio: atual?.data_envio ?? hoje })
    .eq("id", id);
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
  revalidatePath("/projetos");
  revalidar(projetoId);
}
