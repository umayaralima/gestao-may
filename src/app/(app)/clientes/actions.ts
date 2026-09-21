"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CONTATOS_PREFERIDOS, ORIGENS_CLIENTE, STATUS_CLIENTE } from "@/lib/constantes";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  empresa: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  nicho: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  email: z.preprocess(vazioParaNull, z.string().trim().email("E-mail inválido.").nullable()),
  whatsapp: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  origem: z.preprocess(vazioParaNull, z.enum(ORIGENS_CLIENTE).nullable()),
  status: z.enum(STATUS_CLIENTE).default("ativo"),
  observacoes: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  documento: z.preprocess(vazioParaNull, z.string().trim().max(30).nullable()),
  endereco: z.preprocess(vazioParaNull, z.string().trim().max(300).nullable()),
  instagram: z.preprocess(vazioParaNull, z.string().trim().max(80).transform((v) => (v ? v.replace(/^@/, "") : v)).nullable()),
  site: z.preprocess(vazioParaNull, z.string().trim().max(200).nullable()),
  contato_preferido: z.preprocess(vazioParaNull, z.enum(CONTATOS_PREFERIDOS).nullable()),
  acessos: z.preprocess(vazioParaNull, z.string().trim().nullable()),
});

function parse(formData: FormData) {
  return clienteSchema.safeParse(Object.fromEntries(formData));
}

function revalidar(id?: string) {
  revalidatePath("/clientes");
  revalidatePath("/");
  if (id) revalidatePath(`/clientes/${id}`);
}

export async function criarCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").insert(parsed.data).select("id").single();
  if (error) return { erro: "Não foi possível salvar o cliente." };

  revalidar();
  redirect(`/clientes/${data.id}`);
}

export async function atualizarCliente(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update(parsed.data).eq("id", id);
  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidar(id);
  return { ok: true };
}

export async function mudarStatusCliente(id: string, formData: FormData) {
  const status = z.enum(STATUS_CLIENTE).safeParse(formData.get("status"));
  if (!status.success) return;
  const supabase = await createClient();
  await supabase.from("clientes").update({ status: status.data }).eq("id", id);
  revalidar(id);
}

export async function excluirCliente(id: string) {
  const supabase = await createClient();
  await supabase.from("clientes").delete().eq("id", id);
  revalidar();
  revalidatePath("/projetos");
  redirect("/clientes");
}

export async function excluirClientes(ids: string[]) {
  if (!ids.length) return;
  const supabase = await createClient();
  await supabase.from("clientes").delete().in("id", ids);
  revalidar();
  revalidatePath("/projetos");
}
