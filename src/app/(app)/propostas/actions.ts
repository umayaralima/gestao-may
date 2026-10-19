"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getConfiguracoes } from "@/lib/configuracoes";
import { baseUrl } from "@/lib/enviar-resumo";
import { enviarEmail } from "@/lib/resumo-diario";
import { formatBRL, formatDate, hojeISO, somarDias } from "@/lib/format";
import { blocoPagamentoProposta, escopoDoModelo, proximoNumeroProposta, renderizarProposta, type CondicaoId, type DadosProposta } from "@/lib/proposta";
import type { Cliente, Lead, ModeloContrato, Proposta } from "@/lib/types";

export type FormState = { erro?: string; ok?: boolean };

function revalidar(leadId?: string | null, clienteId?: string | null) {
  revalidatePath("/pipeline");
  revalidatePath("/propostas");
  revalidatePath("/");
  if (leadId) revalidatePath(`/pipeline/${leadId}`);
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

const propostaSchema = z.object({
  tipo_projeto: z.string().trim().min(1, "Escolha o tipo de serviço."),
  titulo: z.string().trim().min(3, "Dê um título pra proposta.").max(160),
  valor: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(/\./g, "").replace(",", ".")))
    .refine((v) => Number.isFinite(v) && v > 0, "Informe o valor."),
  prazo_extenso: z.string().trim().min(3, "Informe o prazo.").max(80),
  validade_dias: z.coerce.number().int().min(1).max(90),
  condicao: z.enum(["50_50", "entrada_2x", "entrada_3x", "avista", "cartao"]),
  pagamento_texto: z.string().trim().max(3000).optional(),
  escopo: z.string().trim().max(20000).optional(),
  apresentacao: z.string().trim().max(4000).optional(),
  observacoes: z.string().trim().max(4000).optional(),
});

/** Cria a proposta de um lead (ou cliente, no caso de upsell) e congela o texto. */
export async function criarProposta(dono: { lead?: string; cliente?: string }, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = propostaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const [config, { data: destino }, { data: modelo }, { data: numeros }] = await Promise.all([
    getConfiguracoes(),
    dono.lead
      ? supabase.from("leads").select("*").eq("id", dono.lead).single<Lead>()
      : supabase.from("clientes").select("*").eq("id", dono.cliente!).single<Cliente>(),
    supabase.from("modelos_contrato").select("*").eq("tipo_projeto", d.tipo_projeto).maybeSingle<ModeloContrato>(),
    supabase.from("propostas").select("numero").not("numero", "is", null).returns<Array<{ numero: string }>>(),
  ]);
  if (!destino) return { erro: "Contato não encontrado." };
  if (!config.proposta_corpo) return { erro: "Rode a migração 014_propostas.sql no Supabase." };

  const hoje = hojeISO();
  const validade = somarDias(hoje, d.validade_dias);
  const numero = proximoNumeroProposta((numeros ?? []).map((n) => n.numero), Number(hoje.slice(0, 4)));
  const dados: DadosProposta = {
    pagamento_texto: d.pagamento_texto?.trim() || blocoPagamentoProposta(d.condicao as CondicaoId, d.valor, config.chave_pix),
    escopo: d.escopo,
    apresentacao: d.apresentacao,
    observacoes: d.observacoes,
  };

  const documento = renderizarProposta({
    config,
    destino,
    modelo: modelo ?? null,
    titulo: d.titulo,
    numero,
    valor: d.valor,
    prazoExtenso: d.prazo_extenso,
    validade,
    dados,
    hoje,
  });

  const { error } = await supabase.from("propostas").insert({
    numero,
    lead_id: dono.lead ?? null,
    cliente_id: dono.cliente ?? null,
    tipo_projeto: d.tipo_projeto,
    titulo: d.titulo,
    documento,
    dados,
    valor: d.valor,
    prazo_extenso: d.prazo_extenso,
    validade,
  });
  if (error) return { erro: "Não foi possível salvar a proposta." };

  revalidar(dono.lead, dono.cliente);
  return { ok: true };
}

/** Marca como enviada, move o lead pra "Proposta enviada" e manda o link por e-mail. */
export async function enviarProposta(id: string, porEmail: boolean): Promise<FormState> {
  const supabase = await createClient();
  const [{ data: proposta }, config] = await Promise.all([
    supabase.from("propostas").select("*, leads(nome, email), clientes(nome, empresa, email)").eq("id", id).single<
      Proposta & { leads: { nome: string; email: string | null } | null; clientes: { nome: string; empresa: string | null; email: string | null } | null }
    >(),
    getConfiguracoes(),
  ]);
  if (!proposta) return { erro: "Proposta não encontrada." };

  const destinatario = proposta.leads?.email ?? proposta.clientes?.email ?? null;
  const nome = proposta.leads?.nome ?? proposta.clientes?.empresa ?? proposta.clientes?.nome ?? "";
  const link = `${baseUrl()}/p/${proposta.token}`;

  if (porEmail) {
    if (!destinatario) return { erro: "O contato não tem e-mail no cadastro. Use o link ou o WhatsApp." };
    try {
      await enviarEmail({
        para: destinatario,
        assunto: `Proposta ${proposta.numero} · ${proposta.titulo}`,
        html: emailProposta({ nome: nome.split(" ")[0], titulo: proposta.titulo, valor: proposta.valor, validade: proposta.validade, link, assinatura: config.nome ?? "Mayara Lima" }),
      });
    } catch (e) {
      return { erro: e instanceof Error ? e.message : "Falha ao enviar o e-mail." };
    }
  }

  await supabase
    .from("propostas")
    .update({ status: "enviada", enviada_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["rascunho", "enviada"]);

  // leva o lead pra etapa "Proposta enviada" e marca follow-up
  if (proposta.lead_id) {
    await supabase
      .from("leads")
      .update({ etapa: "proposta_enviada", proximo_followup: somarDias(hojeISO(), 2), nota_followup: `Retornar sobre a proposta ${proposta.numero}`, atualizado_em: new Date().toISOString() })
      .eq("id", proposta.lead_id)
      .in("etapa", ["novo", "em_contato"]);
    await supabase.from("interacoes").insert({
      lead_id: proposta.lead_id,
      data: hojeISO(),
      canal: porEmail ? "email" : "outro",
      resumo: `Proposta ${proposta.numero} enviada (${formatBRL(proposta.valor)})`,
    });
  }

  revalidar(proposta.lead_id, proposta.cliente_id);
  return { ok: true };
}

/** Registra manualmente a resposta do cliente (quando ele responde por fora). */
export async function responderProposta(id: string, status: "aceita" | "recusada", observacao?: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: proposta } = await supabase.from("propostas").select("id, lead_id, cliente_id, numero").eq("id", id).single<Proposta>();
  if (!proposta) return { erro: "Proposta não encontrada." };

  await supabase.from("propostas").update({ status, respondida_em: new Date().toISOString(), resposta_cliente: observacao ?? null, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (proposta.lead_id) {
    await supabase.from("interacoes").insert({ lead_id: proposta.lead_id, data: hojeISO(), canal: "outro", resumo: `Proposta ${proposta.numero} ${status === "aceita" ? "aceita" : "recusada"}${observacao ? `: ${observacao}` : ""}` });
    if (status === "aceita") await supabase.from("leads").update({ etapa: "negociando", atualizado_em: new Date().toISOString() }).eq("id", proposta.lead_id).in("etapa", ["novo", "em_contato", "proposta_enviada"]);
  }

  revalidar(proposta.lead_id, proposta.cliente_id);
  return { ok: true };
}

export async function excluirProposta(id: string, leadId?: string | null) {
  const supabase = await createClient();
  await supabase.from("propostas").delete().eq("id", id);
  revalidar(leadId);
}

/** Salva edições no texto antes de enviar. */
export async function salvarDocumentoProposta(id: string, formData: FormData) {
  const texto = z.string().trim().min(50).max(60000).safeParse(formData.get("documento"));
  if (!texto.success) return;
  const supabase = await createClient();
  await supabase.from("propostas").update({ documento: texto.data, atualizado_em: new Date().toISOString() }).eq("id", id).eq("status", "rascunho");
  revalidatePath("/propostas");
  revalidatePath("/pipeline");
}

/** Sugestão de escopo pro modal (usa o Anexo I do tipo escolhido). */
export async function escopoSugerido(tipo: string): Promise<string> {
  const supabase = await createClient();
  const { data: modelo } = await supabase.from("modelos_contrato").select("*").eq("tipo_projeto", tipo).maybeSingle<ModeloContrato>();
  return escopoDoModelo(modelo ?? null);
}

function emailProposta({ nome, titulo, valor, validade, link, assinatura }: { nome: string; titulo: string; valor: number | null; validade: string | null; link: string; assinatura: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#150C1D">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#150C1D;padding:24px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#231431;border:1px solid #311C45;border-radius:16px;padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
      <tr><td>
        <div style="color:#C17AD2;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Proposta</div>
        <div style="color:#F5F5F4;font-size:20px;font-weight:600;margin-top:8px">Oi, ${nome}!</div>
        <div style="color:#C5C2BE;font-size:14px;margin-top:12px;line-height:1.6">
          Preparei a proposta de <strong style="color:#DDDBD9">${titulo}</strong> com tudo que conversamos: escopo, prazo e investimento.
          ${valor ? `<br><br>Investimento: <strong style="color:#DDDBD9">${formatBRL(valor)}</strong>` : ""}
        </div>
        <div style="margin-top:22px"><a href="${link}" style="display:inline-block;background:#B159C7;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 24px;border-radius:8px">Ver a proposta</a></div>
        ${validade ? `<div style="color:#968F88;font-size:12px;margin-top:16px">A proposta vale até ${formatDate(validade)}.</div>` : ""}
        <div style="color:#C5C2BE;font-size:13px;margin-top:20px">Qualquer dúvida, é só responder este e-mail.<br><br>${assinatura}</div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
