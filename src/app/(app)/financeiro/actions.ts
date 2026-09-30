"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO, TIPO_PAGAMENTO, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";
import { getConfiguracoes } from "@/lib/configuracoes";
import { baseUrl } from "@/lib/enviar-resumo";
import { conferirPagamento, criarLinkCobranca } from "@/lib/infinitepay";

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

/* ---------- Link de cobrança (InfinitePay) ---------- */

/**
 * Gera o link de pagamento da parcela. O `order_nsu` é o id do pagamento (uuid), o que torna
 * o webhook difícil de forjar; mesmo assim o webhook confere em payment_check antes de dar baixa.
 */
export async function gerarLinkCobranca(pagamentoId: string, projetoId: string): Promise<FormState> {
  const supabase = await createClient();
  const [{ data: pagamento }, config] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("id, valor, tipo, vencimento, data_pagamento, link_pagamento, projetos(nome, clientes(nome, empresa, email, whatsapp))")
      .eq("id", pagamentoId)
      .single<{
        id: string;
        valor: number;
        tipo: string | null;
        vencimento: string;
        data_pagamento: string | null;
        link_pagamento: string | null;
        projetos: { nome: string; clientes: { nome: string; empresa: string | null; email: string | null; whatsapp: string | null } | null } | null;
      }>(),
    getConfiguracoes(),
  ]);
  if (!pagamento) return { erro: "Parcela não encontrada." };
  if (pagamento.data_pagamento) return { erro: "Esta parcela já está paga." };
  if (pagamento.link_pagamento) return { erro: "Esta parcela já tem link." };
  if (!config.infinitepay_handle) return { erro: "Informe seu InfiniteTag em Configurações → Financeiro." };

  const cliente = pagamento.projetos?.clientes;
  const descricao = `${pagamento.tipo ? TIPO_PAGAMENTO_LABEL[pagamento.tipo as keyof typeof TIPO_PAGAMENTO_LABEL] : "Pagamento"} · ${pagamento.projetos?.nome ?? "projeto"}`;
  const base = baseUrl();
  const segredo = process.env.INFINITEPAY_WEBHOOK_SECRET;

  try {
    const { url, slug } = await criarLinkCobranca({
      handle: config.infinitepay_handle,
      valor: Number(pagamento.valor),
      descricao,
      orderNsu: pagamento.id,
      webhookUrl: segredo ? `${base}/api/webhooks/infinitepay?s=${encodeURIComponent(segredo)}` : undefined,
      redirectUrl: base,
      cliente: cliente ? { name: cliente.empresa ?? cliente.nome, email: cliente.email, phone_number: cliente.whatsapp } : undefined,
    });

    await supabase.from("pagamentos").update({ link_pagamento: url, link_slug: slug, link_criado_em: new Date().toISOString() }).eq("id", pagamentoId);
    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível gerar o link." };
  }
}

/** Confere na InfinitePay se a parcela já foi paga e dá baixa. */
export async function conferirCobranca(pagamentoId: string, projetoId: string): Promise<FormState> {
  const supabase = await createClient();
  const [{ data: pagamento }, config] = await Promise.all([
    supabase.from("pagamentos").select("id, link_slug, transaction_nsu, data_pagamento").eq("id", pagamentoId).single<{ id: string; link_slug: string | null; transaction_nsu: string | null; data_pagamento: string | null }>(),
    getConfiguracoes(),
  ]);
  if (!pagamento) return { erro: "Parcela não encontrada." };
  if (pagamento.data_pagamento) return { ok: true };
  if (!config.infinitepay_handle) return { erro: "Informe seu InfiniteTag em Configurações → Financeiro." };

  try {
    const r = await conferirPagamento({ handle: config.infinitepay_handle, orderNsu: pagamento.id, transactionNsu: pagamento.transaction_nsu, slug: pagamento.link_slug });
    if (!r.paid) return { erro: "A InfinitePay ainda não registrou o pagamento desta cobrança." };

    await supabase
      .from("pagamentos")
      .update({ data_pagamento: hojeISO(), forma_pagamento: "cartao", transaction_nsu: r.transactionNsu, recibo_url: r.reciboUrl })
      .eq("id", pagamentoId);
    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível consultar a InfinitePay." };
  }
}

/** Remove o link (ex.: valor mudou e é preciso gerar outro). */
export async function removerLinkCobranca(pagamentoId: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("pagamentos").update({ link_pagamento: null, link_slug: null, link_criado_em: null }).eq("id", pagamentoId);
  revalidar(projetoId);
}
