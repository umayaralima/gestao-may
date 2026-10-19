"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUrl } from "@/lib/enviar-resumo";
import { enviarEmail } from "@/lib/resumo-diario";
import { formatBRL, hojeISO, somarDias } from "@/lib/format";
import type { Proposta } from "@/lib/types";

/*
 * Resposta do cliente na página pública. Roda sem sessão (cliente de serviço) e só aceita
 * proposta que esteja "enviada" e dentro da validade — o token é a credencial.
 */

export async function responderPropostaPublica(token: string, resposta: "aceita" | "recusada", observacao?: string): Promise<{ erro?: string; ok?: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { erro: "Link inválido." };

  const supabase = createAdminClient();
  const { data: proposta } = await supabase
    .from("propostas")
    .select("*, leads(nome, empresa), clientes(nome, empresa)")
    .eq("token", token)
    .maybeSingle<Proposta & { leads: { nome: string; empresa: string | null } | null; clientes: { nome: string; empresa: string | null } | null }>();

  if (!proposta) return { erro: "Proposta não encontrada." };
  if (proposta.status !== "enviada") return { erro: "Esta proposta já foi respondida." };
  if (proposta.validade && proposta.validade < hojeISO()) return { erro: "Esta proposta está vencida. Fale comigo pra eu atualizar." };

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("propostas")
    .update({ status: resposta, respondida_em: agora, resposta_cliente: observacao?.trim() || null, atualizado_em: agora })
    .eq("id", proposta.id)
    .eq("status", "enviada");
  if (error) return { erro: "Não foi possível registrar sua resposta. Tente de novo." };

  const nome = proposta.leads?.empresa ?? proposta.leads?.nome ?? proposta.clientes?.empresa ?? proposta.clientes?.nome ?? "Cliente";
  const hoje = hojeISO();

  if (proposta.lead_id) {
    await Promise.all([
      supabase.from("interacoes").insert({
        lead_id: proposta.lead_id,
        data: hoje,
        canal: "outro",
        resumo: `Proposta ${proposta.numero} ${resposta === "aceita" ? "ACEITA pelo cliente" : "com pedido de ajuste"}${observacao ? `: ${observacao.slice(0, 400)}` : ""}`,
      }),
      supabase
        .from("leads")
        .update({
          etapa: "negociando",
          prioridade: "alta",
          proximo_followup: resposta === "aceita" ? hoje : somarDias(hoje, 1),
          nota_followup: resposta === "aceita" ? `Enviar contrato — proposta ${proposta.numero} aceita` : `Ajustar proposta ${proposta.numero}`,
          atualizado_em: agora,
        })
        .eq("id", proposta.lead_id),
    ]);
  }

  // avisa a May na hora
  const { data: config } = await supabase.from("configuracoes").select("email_contato, resumo_email").eq("id", 1).maybeSingle<{ email_contato: string | null; resumo_email: string | null }>();
  const destino = config?.resumo_email?.trim() || config?.email_contato?.trim() || process.env.ALLOWED_EMAIL;
  if (destino) {
    const url = `${baseUrl()}${proposta.lead_id ? `/pipeline/${proposta.lead_id}` : "/propostas"}`;
    await enviarEmail({
      para: destino,
      assunto: resposta === "aceita" ? `🎉 ${nome} aceitou a proposta ${proposta.numero}` : `${nome} pediu ajuste na proposta ${proposta.numero}`,
      html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#150C1D">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#150C1D;padding:24px 12px"><tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#231431;border:1px solid #311C45;border-radius:16px;padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
            <tr><td>
              <div style="color:${resposta === "aceita" ? "#34D399" : "#FBBF24"};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${resposta === "aceita" ? "Proposta aceita" : "Pedido de ajuste"}</div>
              <div style="color:#F5F5F4;font-size:20px;font-weight:600;margin-top:8px">${nome}</div>
              <div style="color:#C5C2BE;font-size:14px;margin-top:8px">${proposta.titulo} · ${formatBRL(proposta.valor)}</div>
              ${observacao ? `<div style="color:#C5C2BE;font-size:13px;margin-top:14px;line-height:1.6;border-left:2px solid #311C45;padding-left:12px">“${observacao.replace(/</g, "&lt;").slice(0, 500)}”</div>` : ""}
              <div style="margin-top:22px"><a href="${url}" style="display:inline-block;background:#B159C7;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px">${resposta === "aceita" ? "Enviar o contrato" : "Ver no pipeline"}</a></div>
            </td></tr>
          </table>
        </td></tr></table></body></html>`,
    }).catch(() => {});
  }

  revalidatePath("/pipeline");
  revalidatePath("/propostas");
  revalidatePath(`/p/${token}`);
  return { ok: true };
}
