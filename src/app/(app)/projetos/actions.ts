"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STATUS_PROJETO } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const projetoSchema = z
  .object({
    cliente_id: z.string().uuid("Selecione o cliente."),
    nome: z.string().trim().min(2, "Informe o nome do projeto."),
    tipo: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable()),
    status: z.enum(STATUS_PROJETO).default("briefing"),
    valor_total: z.preprocess(vazioParaNull, z.coerce.number().nonnegative("Valor inválido.").nullable()),
    data_inicio: z.preprocess(vazioParaNull, z.string().date().nullable()),
    prazo_entrega: z.preprocess(vazioParaNull, z.string().date().nullable()),
    link_projeto: z.preprocess(vazioParaNull, z.string().trim().url("Link inválido (inclua https://).").nullable()),
    observacoes: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  })
  .refine((d) => !d.data_inicio || !d.prazo_entrega || d.prazo_entrega >= d.data_inicio, {
    message: "O prazo de entrega não pode ser antes da data de início.",
  });

function revalidar(id?: string, clienteId?: string) {
  revalidatePath("/projetos");
  revalidatePath("/");
  revalidatePath("/clientes");
  if (id) revalidatePath(`/projetos/${id}`);
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

export async function criarProjeto(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projetoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").insert(parsed.data).select("id").single();
  if (error) return { erro: "Não foi possível salvar o projeto." };

  revalidar(undefined, parsed.data.cliente_id);
  redirect(`/projetos/${data.id}`);
}

export async function atualizarProjeto(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projetoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("projetos").update(parsed.data).eq("id", id);
  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidar(id, parsed.data.cliente_id);
  return { ok: true };
}

/** Troca de status direto na página (regra: status é manual, ação direta). */
export async function mudarStatusProjeto(id: string, formData: FormData) {
  const status = z.enum(STATUS_PROJETO).safeParse(formData.get("status"));
  if (!status.success) return;
  const supabase = await createClient();
  await supabase.from("projetos").update({ status: status.data }).eq("id", id);
  revalidar(id);
}

export async function excluirProjeto(id: string, clienteId: string) {
  const supabase = await createClient();
  await supabase.from("projetos").delete().eq("id", id);
  revalidar(undefined, clienteId);
  revalidatePath("/financeiro");
  redirect(`/clientes/${clienteId}`);
}

// ---------- Briefing ----------
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

/** Um briefing por projeto: upsert em projeto_id. */
export async function salvarBriefing(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = briefingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("briefings").upsert({ projeto_id: projetoId, ...parsed.data }, { onConflict: "projeto_id" });
  if (error) return { erro: "Não foi possível salvar o briefing." };

  revalidar(projetoId);
  return { ok: true };
}

// ---------- Contratos ----------
export async function criarContrato(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const link = z.preprocess(vazioParaNull, z.string().trim().url("Link inválido (inclua https://).").nullable()).safeParse(formData.get("link_documento"));
  if (!link.success) return { erro: link.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("contratos").insert({ projeto_id: projetoId, link_documento: link.data });
  if (error) return { erro: "Não foi possível criar o contrato." };

  revalidar(projetoId);
  return { ok: true };
}

export async function atualizarLinkContrato(id: string, projetoId: string, formData: FormData) {
  const link = z.preprocess(vazioParaNull, z.string().trim().url().nullable()).safeParse(formData.get("link_documento"));
  if (!link.success) return;
  const supabase = await createClient();
  await supabase.from("contratos").update({ link_documento: link.data }).eq("id", id);
  revalidar(projetoId);
}

export async function marcarEnviado(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("contratos").update({ status: "enviado", data_envio: hojeISO() }).eq("id", id);
  revalidar(projetoId);
}

/** Marcar como assinado registra a data de hoje. Não muda o status do projeto: a página sugere. */
export async function marcarAssinado(id: string, projetoId: string) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const { data: atual } = await supabase.from("contratos").select("data_envio").eq("id", id).single<{ data_envio: string | null }>();
  await supabase.from("contratos").update({ status: "assinado", data_assinatura: hoje, data_envio: atual?.data_envio ?? hoje }).eq("id", id);
  revalidar(projetoId);
}

export async function voltarParaRascunho(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("contratos").update({ status: "rascunho", data_envio: null, data_assinatura: null }).eq("id", id);
  revalidar(projetoId);
}

export async function excluirContrato(id: string, projetoId: string) {
  const supabase = await createClient();
  await supabase.from("contratos").delete().eq("id", id);
  revalidar(projetoId);
}

/** Aceite da sugestão "contrato assinado → projeto aprovado". */
export async function aprovarProjeto(projetoId: string) {
  const supabase = await createClient();
  await supabase.from("projetos").update({ status: "aprovado" }).eq("id", projetoId);
  revalidar(projetoId);
}

/* ---------- Etapas de produção (tarefas vinculadas ao projeto, geradas do modelo por tipo) ---------- */

export type ResultadoEtapas = { erro?: string; criadas?: number };

/**
 * Cria as etapas padrão do tipo do projeto como tarefas (categoria + prazo = início + N dias).
 * Só roda se o projeto ainda não tem etapas (tarefas com `ordem`), pra não duplicar.
 */
export async function gerarEtapasDoModelo(projetoId: string): Promise<ResultadoEtapas> {
  const supabase = await createClient();
  const { data: projeto } = await supabase.from("projetos").select("id, tipo, data_inicio, cliente_id").eq("id", projetoId).single<{ id: string; tipo: string | null; data_inicio: string | null; cliente_id: string }>();
  if (!projeto) return { erro: "Projeto não encontrado." };
  if (!projeto.tipo) return { erro: "Defina o tipo de serviço do projeto primeiro." };

  const { count } = await supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("projeto_id", projetoId).not("ordem", "is", null);
  if (count) return { erro: "Este projeto já tem etapas." };

  const { data: modelo } = await supabase.from("etapas_modelo").select("*").eq("tipo_projeto", projeto.tipo).order("ordem").returns<Array<{ nome: string; categoria: string; dias_apos_inicio: number; ordem: number }>>();
  if (!modelo?.length) return { erro: `Nenhuma etapa padrão cadastrada pra "${projeto.tipo}". Cadastre em Configurações → Listas.` };

  const base = projeto.data_inicio ?? hojeISO();
  const somar = (iso: string, dias: number) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  const { error } = await supabase.from("tarefas").insert(
    modelo.map((e) => ({
      titulo: e.nome,
      projeto_id: projetoId,
      categoria: e.categoria,
      prioridade: "media",
      vencimento: somar(base, e.dias_apos_inicio),
      ordem: e.ordem,
    })),
  );
  if (error) return { erro: "Não foi possível criar as etapas." };

  revalidar(projetoId, projeto.cliente_id);
  revalidatePath("/tarefas");
  return { criadas: modelo.length };
}

/** Etapa avulsa criada direto na aba Etapas do projeto (vai pro fim da lista). */
export async function criarEtapa(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      titulo: z.string().trim().min(2, "Dê um nome pra etapa."),
      categoria: z.string().trim().min(1).max(80).default("Outro"),
      vencimento: z.preprocess(vazioParaNull, z.string().date("Data inválida.").nullable()),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: ultima } = await supabase.from("tarefas").select("ordem").eq("projeto_id", projetoId).not("ordem", "is", null).order("ordem", { ascending: false }).limit(1).maybeSingle<{ ordem: number }>();
  const { error } = await supabase.from("tarefas").insert({ ...parsed.data, projeto_id: projetoId, prioridade: "media", ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) return { erro: "Não foi possível criar a etapa." };

  revalidar(projetoId);
  revalidatePath("/tarefas");
  return { ok: true };
}

/** Sugestão (não força): etapas todas concluídas → "Em revisão"; ou marcar direto o status pedido. */
export async function mudarStatusSugerido(projetoId: string, status: "em_desenvolvimento" | "em_revisao" | "entregue") {
  const supabase = await createClient();
  await supabase.from("projetos").update({ status }).eq("id", projetoId);
  revalidar(projetoId);
}
