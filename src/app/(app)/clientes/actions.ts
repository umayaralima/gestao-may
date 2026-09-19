"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ORIGENS_CLIENTE, STATUS_CLIENTE } from "@/lib/constantes";

export type FormState = { erro?: string };

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
});

function parse(formData: FormData) {
  return clienteSchema.safeParse(Object.fromEntries(formData));
}

export async function criarCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").insert(parsed.data).select("id").single();
  if (error) return { erro: "Não foi possível salvar o cliente." };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function atualizarCliente(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update(parsed.data).eq("id", id);
  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function excluirCliente(id: string) {
  const supabase = await createClient();
  await supabase.from("clientes").delete().eq("id", id);
  revalidatePath("/clientes");
  revalidatePath("/projetos");
  redirect("/clientes");
}
