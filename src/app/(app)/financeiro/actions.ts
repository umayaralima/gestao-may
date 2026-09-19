"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO, TIPO_PAGAMENTO } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const pagamentoSchema = z.object({
  projeto_id: z.string().uuid("Selecione o projeto."),
  tipo: z.preprocess(vazioParaNull, z.enum(TIPO_PAGAMENTO).nullable()),
  valor: z.coerce.number().positive("Informe um valor maior que zero."),
  vencimento: z.string().date("Informe o vencimento."),
  forma_pagamento: z.preprocess(vazioParaNull, z.enum(FORMAS_PAGAMENTO).nullable()),
});

function revalidar(projetoId?: string) {
  revalidatePath("/financeiro");
  revalidatePath("/");
  if (projetoId) revalidatePath(`/projetos/${projetoId}`);
}

export async function criarPagamento(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = pagamentoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Regra de sanidade: vencimento não pode ser antes do início do projeto.
  const { data: projeto } = await supabase.from("projetos").select("data_inicio").eq("id", parsed.data.projeto_id).single<{ data_inicio: string | null }>();
  if (projeto?.data_inicio && parsed.data.vencimento < projeto.data_inicio) {
    return { erro: "O vencimento não pode ser antes da data de início do projeto." };
  }

  const { error } = await supabase.from("pagamentos").insert(parsed.data);
  if (error) return { erro: "Não foi possível salvar o lançamento." };

  revalidar(parsed.data.projeto_id);
  return { ok: true };
}

/** Marcar como pago registra a data de hoje e a forma escolhida no modal. */
export async function marcarComoPago(id: string, projetoId: string, forma: string | null) {
  const supabase = await createClient();
  const formaOk = FORMAS_PAGAMENTO.includes(forma as (typeof FORMAS_PAGAMENTO)[number]) ? forma : null;
  await supabase.from("pagamentos").update({ data_pagamento: hojeISO(), forma_pagamento: formaOk }).eq("id", id);
  revalidar(projetoId);
}

export async function desfazerPagamento(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("pagamentos").update({ data_pagamento: null }).eq("id", id);
  revalidar(projetoId);
}

export async function excluirPagamento(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("pagamentos").delete().eq("id", id);
  revalidar(projetoId);
}
