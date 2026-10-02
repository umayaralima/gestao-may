import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUrl } from "@/lib/enviar-resumo";
import { enviarEmail } from "@/lib/resumo-diario";
import { hojeISO } from "@/lib/format";

/*
 * Entrada pública de leads: formulário do site (webhook do Elementor), ManyChat (External Request)
 * ou qualquer outra ferramenta. Autenticação pelo token de `configuracoes.leads_token`, em
 * ?token=, no header x-api-key ou no corpo. Cai direto em Prospecção com follow-up pra hoje.
 */

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Aceita os nomes de campo mais comuns de formulário/chatbot. */
function pegar(dados: Record<string, unknown>, chaves: string[]) {
  for (const k of chaves) {
    const v = dados[k] ?? dados[k.toLowerCase()] ?? dados[k.toUpperCase()];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

const ORIGENS_VALIDAS = ["indicacao", "instagram", "site", "linkedin", "outro"];

export async function POST(request: NextRequest) {
  let dados: Record<string, unknown> = {};
  const tipo = request.headers.get("content-type") ?? "";
  try {
    if (tipo.includes("application/json")) {
      dados = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      dados = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : v.name]));
    }
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400, headers: CORS });
  }

  const token = request.nextUrl.searchParams.get("token") ?? request.headers.get("x-api-key") ?? (typeof dados.token === "string" ? dados.token : null);
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ erro: "Token ausente ou inválido." }, { status: 401, headers: CORS });

  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("configuracoes")
    .select("id, nome, email_contato, resumo_email")
    .eq("leads_token", token)
    .maybeSingle<{ id: number; nome: string | null; email_contato: string | null; resumo_email: string | null }>();
  if (!config) return NextResponse.json({ erro: "Token não reconhecido." }, { status: 401, headers: CORS });

  // honeypot: formulário com esse campo preenchido é robô
  if (pegar(dados, ["_honey", "website_url", "hp"])) return NextResponse.json({ ok: true, ignorado: "spam" }, { headers: CORS });

  const nome = pegar(dados, ["nome", "name", "nome_completo", "full_name", "first_name"]);
  const email = pegar(dados, ["email", "e-mail", "mail"]);
  const whatsapp = pegar(dados, ["whatsapp", "telefone", "phone", "celular", "phone_number", "tel"]);
  const instagram = pegar(dados, ["instagram", "ig", "perfil"]);
  const mensagem = pegar(dados, ["mensagem", "message", "msg", "observacoes", "comentario", "descricao"]);
  const servico = pegar(dados, ["servico", "servico_interesse", "assunto", "interesse", "subject", "tipo_projeto"]);
  const empresa = pegar(dados, ["empresa", "company", "negocio"]);
  const origemBruta = (pegar(dados, ["origem", "source", "utm_source"]) ?? "site").toLowerCase();
  const origem = ORIGENS_VALIDAS.includes(origemBruta) ? origemBruta : origemBruta.includes("insta") ? "instagram" : "outro";
  const entrada = pegar(dados, ["entrada", "canal"]) ?? (origem === "instagram" ? "manychat" : "formulario");
  const valor = pegar(dados, ["valor", "valor_estimado", "orcamento", "budget"]);

  const registrar = (lead_id: string | null, erro?: string) =>
    supabase.from("entradas_lead").insert({ origem: entrada, payload: dados as never, lead_id, erro: erro ?? null });

  const parsed = z.object({ nome: z.string().trim().min(2, "Nome é obrigatório.") }).safeParse({ nome });
  if (!parsed.success || (!email && !whatsapp && !instagram)) {
    await registrar(null, "faltou nome ou contato");
    return NextResponse.json({ erro: "Informe ao menos o nome e um contato (e-mail, WhatsApp ou Instagram)." }, { status: 400, headers: CORS });
  }

  const hoje = hojeISO();
  const nota = mensagem ? mensagem.slice(0, 160) : "Responder contato novo";

  // Já existe lead aberto desse contato? Então registra interação em vez de duplicar o funil.
  const filtros = [email ? `email.eq.${email}` : null, whatsapp ? `whatsapp.eq.${whatsapp}` : null].filter(Boolean).join(",");
  const { data: existente } = filtros
    ? await supabase.from("leads").select("id, nome").in("etapa", ["novo", "em_contato", "proposta_enviada", "negociando"]).or(filtros).maybeSingle<{ id: string; nome: string }>()
    : { data: null };

  if (existente) {
    await Promise.all([
      supabase.from("interacoes").insert({ lead_id: existente.id, data: hoje, canal: entrada === "manychat" ? "instagram" : "outro", resumo: `Novo contato pelo ${entrada}: ${mensagem ?? "sem mensagem"}`.slice(0, 500) }),
      supabase.from("leads").update({ proximo_followup: hoje, nota_followup: nota, atualizado_em: new Date().toISOString() }).eq("id", existente.id),
      registrar(existente.id),
    ]);
    avisarPorEmail({ config, nome: existente.nome, mensagem, entrada, repetido: true }).catch(() => {});
    return NextResponse.json({ ok: true, lead: existente.id, repetido: true }, { headers: CORS });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      nome: parsed.data.nome,
      empresa,
      email,
      whatsapp,
      instagram,
      origem,
      entrada,
      mensagem,
      servico_interesse: servico,
      valor_estimado: valor ? Number(valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || null : null,
      etapa: "novo",
      prioridade: "alta",
      proximo_followup: hoje,
      nota_followup: nota,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !lead) {
    await registrar(null, error?.message ?? "falha ao inserir");
    return NextResponse.json({ erro: "Não foi possível registrar o contato." }, { status: 500, headers: CORS });
  }

  await registrar(lead.id);
  avisarPorEmail({ config, nome: parsed.data.nome, mensagem, entrada, leadId: lead.id }).catch(() => {});
  return NextResponse.json({ ok: true, lead: lead.id }, { headers: CORS });
}

async function avisarPorEmail({
  config,
  nome,
  mensagem,
  entrada,
  leadId,
  repetido,
}: {
  config: { nome: string | null; email_contato: string | null; resumo_email: string | null };
  nome: string;
  mensagem: string | null;
  entrada: string;
  leadId?: string;
  repetido?: boolean;
}) {
  const destino = config.resumo_email?.trim() || config.email_contato?.trim() || process.env.ALLOWED_EMAIL;
  if (!destino) return;
  const url = `${baseUrl()}/pipeline${leadId ? `/${leadId}` : ""}`;
  await enviarEmail({
    para: destino,
    assunto: repetido ? `${nome} mandou mensagem de novo` : `Novo contato: ${nome}`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#150C1D">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#150C1D;padding:24px 12px"><tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#231431;border:1px solid #311C45;border-radius:16px;padding:26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
          <tr><td>
            <div style="color:#C17AD2;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${repetido ? "Contato repetido" : "Novo lead"} · ${entrada}</div>
            <div style="color:#F5F5F4;font-size:19px;font-weight:600;margin-top:8px">${nome.replace(/</g, "&lt;")}</div>
            ${mensagem ? `<div style="color:#C5C2BE;font-size:13px;margin-top:10px;line-height:1.6">“${mensagem.replace(/</g, "&lt;").slice(0, 400)}”</div>` : ""}
            <div style="margin-top:20px"><a href="${url}" style="display:inline-block;background:#B159C7;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:8px">Abrir no pipeline</a></div>
            <div style="color:#5A496A;font-size:11px;margin-top:16px">Follow-up marcado pra hoje.</div>
          </td></tr>
        </table>
      </td></tr></table></body></html>`,
  });
}
