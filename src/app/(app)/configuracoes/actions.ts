"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { erro?: string; ok?: boolean };

function revalidar() {
  revalidatePath("/configuracoes");
  revalidatePath("/projetos");
  revalidatePath("/pipeline");
}

export async function criarTipoProjeto(_prev: FormState, formData: FormData): Promise<FormState> {
  const nome = z.string().trim().min(2, "Informe o nome do serviço.").max(80).safeParse(formData.get("nome"));
  if (!nome.success) return { erro: nome.error.issues[0].message };

  const supabase = await createClient();
  const { data: ultimo } = await supabase.from("tipos_projeto").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle<{ ordem: number }>();
  const { error } = await supabase.from("tipos_projeto").insert({ nome: nome.data, ordem: (ultimo?.ordem ?? 0) + 1 });
  if (error) return { erro: error.code === "23505" ? "Já existe um serviço com esse nome." : "Não foi possível salvar." };

  revalidar();
  return { ok: true };
}

export async function renomearTipoProjeto(id: string, formData: FormData) {
  const nome = z.string().trim().min(2).max(80).safeParse(formData.get("nome"));
  if (!nome.success) return;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("tipos_projeto").select("nome").eq("id", id).single<{ nome: string }>();
  if (!atual || atual.nome === nome.data) return;

  const { error } = await supabase.from("tipos_projeto").update({ nome: nome.data }).eq("id", id);
  if (error) return;

  // Projetos e leads guardam o nome em texto: propaga o rename.
  await supabase.from("projetos").update({ tipo: nome.data }).eq("tipo", atual.nome);
  await supabase.from("leads").update({ servico_interesse: nome.data }).eq("servico_interesse", atual.nome);
  await supabase.from("etapas_modelo").update({ tipo_projeto: nome.data }).eq("tipo_projeto", atual.nome);
  revalidar();
}

export async function excluirTipoProjeto(id: string) {
  const supabase = await createClient();
  await supabase.from("tipos_projeto").delete().eq("id", id);
  revalidar();
}

/* ---------- Configurações gerais (tabela `configuracoes`, linha 1) ---------- */

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));
const inteiro = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const esquemas = {
  perfil: z.object({
    nome: texto(120),
    titulo: texto(80),
    email_contato: z.union([z.literal(""), z.string().trim().email("E-mail inválido.")]).transform((v) => (v === "" ? null : v)),
    telefone: texto(30),
  }),
  empresa: z.object({
    empresa: texto(120),
    cnpj: texto(20),
    site: texto(160),
  }),
  pipeline: z.object({
    dias_negocio_parado: inteiro(1, 365),
  }),
  financeiro: z.object({
    meta_mensal: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v.replace(/\./g, "").replace(",", "."))))
      .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Valor inválido."),
    dias_aviso_vencimento: inteiro(0, 90),
    forma_pagamento_preferida: z.enum(["pix", "boleto", "cartao", "transferencia", "outro"]),
    chave_pix: texto(120),
    infinitepay_handle: z
      .string()
      .trim()
      .max(60)
      .transform((v) => (v === "" ? null : v.replace(/^\$/, ""))),
  }),
} as const;

export type SecaoConfig = keyof typeof esquemas;

export async function salvarConfiguracoes(secao: SecaoConfig, _prev: FormState, formData: FormData): Promise<FormState> {
  const bruto = Object.fromEntries(Array.from(formData.entries()).filter(([k]) => !k.startsWith("$")));
  const parsed = esquemas[secao].safeParse(bruto);
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("configuracoes").upsert({ id: 1, ...parsed.data, atualizado_em: new Date().toISOString() });
  if (error) return { erro: error.code === "42P01" || error.code === "PGRST205" ? "Rode a migração 005_configuracoes.sql no Supabase." : "Não foi possível salvar." };

  revalidar();
  revalidatePath("/", "layout"); // sidebar (nome/título), dashboard, pipeline, financeiro
  return { ok: true };
}

/* ---------- Senha (Supabase Auth) ---------- */

export async function alterarSenha(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      senha_atual: z.string().min(1, "Informe a senha atual."),
      senha_nova: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres."),
      senha_conf: z.string(),
    })
    .refine((v) => v.senha_nova === v.senha_conf, { message: "A confirmação não bate com a nova senha." })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { erro: "Sessão expirada. Entre de novo." };

  // Confere a senha atual antes de trocar
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.senha_atual });
  if (erroLogin) return { erro: "Senha atual incorreta." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha_nova });
  if (error) return { erro: error.message.includes("different") ? "A nova senha precisa ser diferente da atual." : "Não foi possível alterar a senha." };
  return { ok: true };
}

/* ---------- Categorias de tarefa (tabela categorias_tarefa; a tarefa guarda o nome) ---------- */

const GRUPOS = ["comercial", "producao", "outro"] as const;

function revalidarTarefas() {
  revalidatePath("/configuracoes");
  revalidatePath("/tarefas");
  revalidatePath("/projetos", "layout");
}

export async function criarCategoriaTarefa(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      nome: z.string().trim().min(2, "Informe o nome da categoria.").max(80),
      grupo: z.enum(GRUPOS).default("producao"),
      icone: z.string().trim().max(8).transform((v) => v || "•"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: ultimo } = await supabase.from("categorias_tarefa").select("ordem").eq("grupo", parsed.data.grupo).order("ordem", { ascending: false }).limit(1).maybeSingle<{ ordem: number }>();
  const { error } = await supabase.from("categorias_tarefa").insert({ ...parsed.data, ordem: (ultimo?.ordem ?? 0) + 1 });
  if (error) return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível salvar." };

  revalidarTarefas();
  return { ok: true };
}

export async function atualizarCategoriaTarefa(id: string, formData: FormData) {
  const parsed = z
    .object({ nome: z.string().trim().min(2).max(80), grupo: z.enum(GRUPOS), icone: z.string().trim().max(8).transform((v) => v || "•") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("categorias_tarefa").select("nome").eq("id", id).single<{ nome: string }>();
  if (!atual) return;

  const { error } = await supabase.from("categorias_tarefa").update(parsed.data).eq("id", id);
  if (error) return;
  if (atual.nome !== parsed.data.nome) {
    await supabase.from("tarefas").update({ categoria: parsed.data.nome }).eq("categoria", atual.nome);
    await supabase.from("etapas_modelo").update({ categoria: parsed.data.nome }).eq("categoria", atual.nome);
  }
  revalidarTarefas();
}

export async function excluirCategoriaTarefa(id: string) {
  const supabase = await createClient();
  await supabase.from("categorias_tarefa").delete().eq("id", id);
  revalidarTarefas();
}

/* ---------- Etapas padrão por tipo de serviço (etapas_modelo) ---------- */

const etapaModeloSchema = z.object({
  tipo_projeto: z.string().trim().min(1, "Escolha o tipo de serviço."),
  nome: z.string().trim().min(2, "Dê um nome pra etapa.").max(120),
  categoria: z.string().trim().min(1).max(80).default("Outro"),
  dias_apos_inicio: z.coerce.number().int().min(0).max(365).default(0),
});

function revalidarEtapasModelo() {
  revalidatePath("/configuracoes");
  revalidatePath("/projetos", "layout");
}

export async function criarEtapaModelo(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = etapaModeloSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: ultima } = await supabase.from("etapas_modelo").select("ordem").eq("tipo_projeto", parsed.data.tipo_projeto).order("ordem", { ascending: false }).limit(1).maybeSingle<{ ordem: number }>();
  const { error } = await supabase.from("etapas_modelo").insert({ ...parsed.data, ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) return { erro: error.code === "PGRST205" ? "Rode a migração 008_etapas_modelo.sql no Supabase." : "Não foi possível salvar." };

  revalidarEtapasModelo();
  return { ok: true };
}

export async function atualizarEtapaModelo(id: string, formData: FormData) {
  const parsed = etapaModeloSchema.omit({ tipo_projeto: true }).extend({ ordem: z.coerce.number().int().min(0).max(999) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("etapas_modelo").update(parsed.data).eq("id", id);
  revalidarEtapasModelo();
}

export async function excluirEtapaModelo(id: string) {
  const supabase = await createClient();
  await supabase.from("etapas_modelo").delete().eq("id", id);
  revalidarEtapasModelo();
}

/* ---------- Notificações (resumo diário + feed da agenda) ---------- */

export async function salvarNotificacoes(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      resumo_diario: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
      resumo_email: z.union([z.literal(""), z.string().trim().email("E-mail inválido.")]).transform((v) => (v === "" ? null : v)),
    })
    .safeParse({ resumo_diario: formData.get("resumo_diario") ?? "false", resumo_email: formData.get("resumo_email") ?? "" });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("configuracoes").update({ ...parsed.data, atualizado_em: new Date().toISOString() }).eq("id", 1);
  if (error) return { erro: error.code === "42703" ? "Rode a migração 009_notificacoes.sql no Supabase." : "Não foi possível salvar." };

  revalidatePath("/configuracoes");
  return { ok: true };
}

/** Manda o resumo agora (ignora o "já enviei hoje" e o desligamento), pra testar o e-mail. */
export async function enviarResumoAgora(): Promise<FormState> {
  const { enviarResumoDiario } = await import("@/lib/enviar-resumo");
  try {
    const r = await enviarResumoDiario({ forcar: true });
    if (r.erro) return { erro: r.erro };
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao enviar." };
  }
}

/** Gera um novo link do calendário (o antigo para de funcionar). */
export async function trocarTokenAgenda() {
  const supabase = await createClient();
  await supabase.from("configuracoes").update({ agenda_token: crypto.randomUUID() }).eq("id", 1);
  revalidatePath("/configuracoes");
}

/* ---------- Contratos: dados da contratada, corpo e modelos por tipo ---------- */

function revalidarContratos() {
  revalidatePath("/configuracoes");
  revalidatePath("/projetos", "layout");
}

export async function salvarDadosContrato(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      razao_social: texto(160),
      cnpj: texto(20),
      endereco_empresa: texto(300),
      cidade_foro: texto(80),
      email_contratual: z.union([z.literal(""), z.string().trim().email("E-mail inválido.")]).transform((v) => (v === "" ? null : v)),
      contrato_corpo: z.string().trim().min(100, "O corpo do contrato está curto demais.").max(120000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("configuracoes").update({ ...parsed.data, atualizado_em: new Date().toISOString() }).eq("id", 1);
  if (error) return { erro: error.code === "42703" ? "Rode a migração 010_contratos.sql no Supabase." : "Não foi possível salvar." };

  revalidarContratos();
  return { ok: true };
}

const modeloSchema = z.object({
  titulo: z.string().trim().min(5, "Informe o título do contrato.").max(160),
  objeto: z.string().trim().min(20, "Descreva o objeto (cláusula 1.1).").max(2000),
  prazo_dias: z.coerce.number().int().min(1).max(365),
  prazo_extenso: z.string().trim().min(5, "Ex.: 15 (quinze) dias úteis.").max(80),
  anexo: z.string().trim().min(50, "O Anexo I está curto demais.").max(40000),
});

export async function salvarModeloContrato(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = modeloSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("modelos_contrato").update(parsed.data).eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidarContratos();
  return { ok: true };
}

/** Cria o modelo de um tipo de serviço, copiando o Anexo de outro tipo quando indicado. */
export async function criarModeloContrato(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      tipo_projeto: z.string().trim().min(2, "Escolha o tipo de serviço."),
      copiar_de: z.string().trim().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const base = parsed.data.copiar_de
    ? (await supabase.from("modelos_contrato").select("*").eq("tipo_projeto", parsed.data.copiar_de).maybeSingle<{ titulo: string; objeto: string; prazo_dias: number; prazo_extenso: string; anexo: string }>()).data
    : null;

  const nome = parsed.data.tipo_projeto;
  const { error } = await supabase.from("modelos_contrato").insert({
    tipo_projeto: nome,
    titulo: base?.titulo ?? `DESENVOLVIMENTO DE ${nome.toUpperCase()}`,
    objeto: base?.objeto ?? `O presente contrato tem por objeto a prestação de serviços de ${nome.toLowerCase()}, conforme escopo técnico detalhado no Anexo I, parte integrante deste contrato.`,
    prazo_dias: base?.prazo_dias ?? 30,
    prazo_extenso: base?.prazo_extenso ?? "30 (trinta) dias úteis",
    anexo: base?.anexo ?? `## ANEXO I\n### ESCOPO DO PROJETO\n\n**Projeto:** {{projeto_nome}}\n**Tipo:** ${nome}\n**Valor total:** {{valor}} ({{valor_extenso}})\n**Prazo de desenvolvimento:** {{prazo_extenso}}, conforme Cláusula 4.\n### 1. O QUE ESTÁ INCLUSO\n- \n### 2. TEXTOS DO SITE\n☐ Fornecidos pelo CONTRATANTE.\n☐ Redação (copy) pela CONTRATADA, com base no briefing, dentro das rodadas de revisão da Cláusula 5.\n### 3. LICENÇAS INCLUÍDAS PELA CONTRATADA\n☐ Nenhuma. Todas as licenças premium são de responsabilidade do CONTRATANTE.\n☐ [NOME DA LICENÇA], pelo período de [PERÍODO], conforme Cláusula 9.2.\n### 4. MATERIAL A SER FORNECIDO PELO CONTRATANTE\n- Formulário de briefing preenchido.\n### 5. O QUE NÃO ESTÁ INCLUSO\n- `,
  });
  if (error) return { erro: error.code === "23505" ? "Esse tipo já tem modelo." : "Não foi possível criar." };

  revalidarContratos();
  return { ok: true };
}

export async function excluirModeloContrato(id: string) {
  const supabase = await createClient();
  await supabase.from("modelos_contrato").delete().eq("id", id);
  revalidarContratos();
}

/** Testa o token do Autentique: devolve nome da conta e documentos restantes no plano. */
export async function testarAutentique(): Promise<{ erro?: string; conta?: string; documentos?: string }> {
  try {
    const { contaAutentique } = await import("@/lib/autentique");
    const me = await contaAutentique();
    return {
      conta: `${me.name} (${me.email})`,
      documentos: me.subscription?.has_premium_features ? "plano pago" : me.subscription?.documents != null ? `${me.subscription.documents} documento(s) no plano` : "plano gratuito",
    };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível falar com o Autentique." };
  }
}
