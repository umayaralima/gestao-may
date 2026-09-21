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
