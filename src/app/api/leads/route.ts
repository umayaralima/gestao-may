import { after, NextResponse, type NextRequest } from "next/server";
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

/**
 * Resposta padrão da rota: sempre 200.
 * O Elementor (e a maioria dos plugins) trata qualquer status de erro como falha do formulário
 * e trava o envio do visitante — o que seria pior do que perder o registro. O motivo real fica
 * no corpo da resposta e na lista "Últimos contatos recebidos", em Configurações → Integrações.
 */
function responder(corpo: Record<string, unknown>) {
  return NextResponse.json(corpo, { status: 200, headers: CORS });
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/*
 * Normaliza o formato de cada ferramenta:
 * - Elementor manda form_fields[nome]; WPForms/Fluent mandam fields[nome] ou data[nome];
 * - alguns enviam um objeto aninhado em "fields"/"form_fields"/"data".
 * Tudo vira chave simples ("nome", "email"…).
 */
function normalizar(dados: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(dados)) {
    const aninhado = chave.match(/^(?:form_fields|fields|data|form)\[([^\]]+)\]/);
    if (aninhado) {
      saida[aninhado[1]] = valor;
      continue;
    }
    if (["form_fields", "fields", "data"].includes(chave) && valor && typeof valor === "object" && !Array.isArray(valor)) {
      for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
        // Elementor REST manda { campo: { id, value } }
        saida[k] = v && typeof v === "object" && "value" in (v as object) ? (v as { value: unknown }).value : v;
      }
      continue;
    }
    saida[chave] = valor;
  }
  return saida;
}

/** Faixa de investimento vem como texto ("de R$ 3 a 5 mil"); só vira número quando é um valor limpo. */
function valorNumerico(bruto: string | null): number | null {
  if (!bruto) return null;
  const limpo = bruto.replace(/[R$\s]/gi, "");
  if (!/^[\d.,]+$/.test(limpo)) return null;
  const numero = Number(limpo.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
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

/** Campos que já viram coluna do lead — o resto do formulário vai pra "respostas". */
const CAMPOS_CONHECIDOS = new Set([
  "nome", "name", "nome_completo", "full_name", "first_name", "last_name",
  "email", "e-mail", "mail",
  "whatsapp", "telefone", "phone", "celular", "phone_number", "tel",
  "instagram", "ig", "perfil", "ig_username",
  "mensagem", "message", "msg", "observacoes", "comentario", "descricao", "last_input_text",
  "servico", "servico_interesse", "assunto", "interesse", "subject", "tipo_projeto",
  "empresa", "company", "negocio",
  "origem", "source", "utm_source", "canal", "entrada",
  "valor", "valor_estimado", "orcamento", "budget",
  "token", "_honey", "website_url", "hp",
]);

/** Rótulo bonito pras perguntas que combinamos com a May no formulário do site. */
const ROTULOS: Record<string, string> = {
  segmento: "Segmento do negócio",
  nicho: "Segmento do negócio",
  prazo: "Prazo desejado",
  prazo_entrega: "Prazo desejado",
  investimento: "Faixa de investimento",
  faixa_investimento: "Faixa de investimento",
  horario: "Melhor horário pra conversar",
  melhor_horario: "Melhor horário pra conversar",
};

/** Transforma "qual_o_segmento" em "Qual o segmento". */
const rotularChave = (chave: string) =>
  ROTULOS[chave.toLowerCase()] ??
  chave.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());

/** Tudo que o formulário mandou e não virou coluna do lead. */
function respostasExtras(dados: Record<string, unknown>): Record<string, string> {
  const extras: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(dados)) {
    if (CAMPOS_CONHECIDOS.has(chave.toLowerCase())) continue;
    if (/^(form_id|form_name|post_id|page_url|queried_id|referrer|user_agent|remote_ip|page_title|flow_ns|subscriber_id)$/i.test(chave)) continue;
    const texto = typeof valor === "string" ? valor.trim() : typeof valor === "number" ? String(valor) : "";
    if (!texto || texto.length > 500) continue;
    extras[rotularChave(chave)] = texto;
  }
  return extras;
}

/** GET só confirma que o endereço está vivo e o token confere — não cria lead. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return responder({ ok: false, motivo: "Token ausente ou inválido." });
  const supabase = createAdminClient();
  const { data } = await supabase.from("configuracoes").select("id").eq("leads_token", token).maybeSingle();
  return responder(data ? { ok: true, pronto: "Endereço válido. Configure o webhook do formulário para enviar por POST." } : { ok: false, motivo: "Token não reconhecido." });
}

export async function POST(request: NextRequest) {
  let dados: Record<string, unknown> = {};
  const tipo = request.headers.get("content-type") ?? "";
  try {
    if (tipo.includes("application/json")) {
      dados = normalizar((await request.json()) as Record<string, unknown>);
    } else {
      const form = await request.formData();
      dados = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : v.name]));
      dados = normalizar(dados);
    }
  } catch {
    return responder({ ok: false, motivo: "Corpo inválido." });
  }

  const token = request.nextUrl.searchParams.get("token") ?? request.headers.get("x-api-key") ?? (typeof dados.token === "string" ? dados.token : null);
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return responder({ ok: false, motivo: "Token ausente ou inválido." });

  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("configuracoes")
    .select("id, nome, email_contato, resumo_email")
    .eq("leads_token", token)
    .maybeSingle<{ id: number; nome: string | null; email_contato: string | null; resumo_email: string | null }>();
  if (!config) return responder({ ok: false, motivo: "Token não reconhecido." });

  // honeypot: formulário com esse campo preenchido é robô
  if (pegar(dados, ["_honey", "website_url", "hp"])) return responder({ ok: true, ignorado: "spam" });

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
  const valor = pegar(dados, ["valor", "valor_estimado", "orcamento", "budget", "investimento", "faixa_investimento"]);
  const segmento = pegar(dados, ["segmento", "nicho"]);
  const respostas = respostasExtras(dados);

  const registrar = (lead_id: string | null, erro?: string) =>
    supabase.from("entradas_lead").insert({
      origem: entrada,
      payload: { ...dados, _content_type: tipo, _campos: Object.keys(dados).join(", ") } as never,
      lead_id,
      erro: erro ?? null,
    });

  const parsed = z.object({ nome: z.string().trim().min(2, "Nome é obrigatório.") }).safeParse({ nome });
  if (!parsed.success || (!email && !whatsapp && !instagram)) {
    await registrar(null, "faltou nome ou contato");
    return responder({ ok: false, motivo: "Informe ao menos o nome e um contato (e-mail, WhatsApp ou Instagram).", campos_recebidos: Object.keys(dados) });
  }

  const hoje = hojeISO();
  const nota = [segmento, mensagem].filter(Boolean).join(" · ").slice(0, 160) || "Responder contato novo";

  // Já existe lead aberto desse contato? Então registra interação em vez de duplicar o funil.
  const filtros = [email ? `email.eq.${email}` : null, whatsapp ? `whatsapp.eq.${whatsapp}` : null].filter(Boolean).join(",");
  const { data: existente } = filtros
    ? await supabase.from("leads").select("id, nome").in("etapa", ["novo", "em_contato", "proposta_enviada", "negociando"]).or(filtros).maybeSingle<{ id: string; nome: string }>()
    : { data: null };

  if (existente) {
    await Promise.all([
      supabase.from("interacoes").insert({ lead_id: existente.id, data: hoje, canal: entrada === "manychat" ? "instagram" : "outro", resumo: `Novo contato pelo ${entrada}: ${mensagem ?? "sem mensagem"}`.slice(0, 500) }),
      supabase
        .from("leads")
        .update({ proximo_followup: hoje, nota_followup: nota, respostas, atualizado_em: new Date().toISOString() })
        .eq("id", existente.id),
      registrar(existente.id),
    ]);
    after(() => avisarPorEmail({ config, nome: existente.nome, mensagem, entrada, repetido: true }).catch(() => {}));
    return responder({ ok: true, lead: existente.id, repetido: true });
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
      valor_estimado: valorNumerico(valor),
      respostas,
      etapa: "novo",
      prioridade: "alta",
      proximo_followup: hoje,
      nota_followup: nota,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !lead) {
    await registrar(null, error?.message ?? "falha ao inserir");
    return responder({ ok: false, motivo: "Não foi possível registrar o contato." });
  }

  await registrar(lead.id);
  after(() => avisarPorEmail({ config, nome: parsed.data.nome, mensagem, entrada, leadId: lead.id }).catch(() => {}));
  return responder({ ok: true, lead: lead.id });
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
