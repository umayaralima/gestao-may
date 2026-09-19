"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STATUS_PROJETO, TIPO_PROJETO } from "@/lib/constantes";

export type FormState = { erro?: string };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const projetoSchema = z
  .object({
    cliente_id: z.string().uuid("Selecione o cliente."),
    nome: z.string().trim().min(2, "Informe o nome do projeto."),
    tipo: z.preprocess(vazioParaNull, z.enum(TIPO_PROJETO).nullable()),
    status: z.enum(STATUS_PROJETO).default("briefing"),
    valor_total: z.preprocess(vazioParaNull, z.coerce.number().nonnegative("Valor inválido.").nullable()),
    data_inicio: z.preprocess(vazioParaNull, z.string().date().nullable()),
    prazo_entrega: z.preprocess(vazioParaNull, z.string().date().nullable()),
    link_projeto: z.preprocess(vazioParaNull, z.string().trim().url("Link inválido (inclua https://).").nullable()),
    observacoes: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  })
  .refine((d) => !d.data_inicio || !d.prazo_entrega || d.prazo_entrega >= d.data_inicio, {
    message: "O prazo de entrega não pode ser antes da data de início.",
    path: ["prazo_entrega"],
  });

function parse(formData: FormData) {
  return projetoSchema.safeParse(Object.fromEntries(formData));
}

export async function criarProjeto(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").insert(parsed.data).select("id").single();
  if (error) return { erro: "Não foi possível salvar o projeto." };

  revalidatePath("/projetos");
  revalidatePath(`/clientes/${parsed.data.cliente_id}`);
  revalidatePath("/");
  redirect(`/projetos/${data.id}`);
}

export async function atualizarProjeto(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("projetos").update(parsed.data).eq("id", id);
  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${id}`);
  revalidatePath("/");
  redirect(`/projetos/${id}`);
}

/** Troca de status direto na página do projeto (regra: status é manual, ação direta). */
export async function mudarStatusProjeto(id: string, formData: FormData) {
  const status = z.enum(STATUS_PROJETO).safeParse(formData.get("status"));
  if (!status.success) return;

  const supabase = await createClient();
  await supabase.from("projetos").update({ status: status.data }).eq("id", id);

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${id}`);
  revalidatePath("/");
}

export async function excluirProjeto(id: string, clienteId: string) {
  const supabase = await createClient();
  await supabase.from("projetos").delete().eq("id", id);
  revalidatePath("/projetos");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/");
  redirect(`/clientes/${clienteId}`);
}
