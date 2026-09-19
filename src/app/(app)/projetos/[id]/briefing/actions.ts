"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

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

/** Um briefing por projeto: cria na primeira vez, atualiza nas seguintes (unique em projeto_id). */
export async function salvarBriefing(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = briefingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("briefings")
    .upsert({ projeto_id: projetoId, ...parsed.data }, { onConflict: "projeto_id" });
  if (error) return { erro: "Não foi possível salvar o briefing." };

  revalidatePath(`/projetos/${projetoId}`);
  return { ok: true };
}
