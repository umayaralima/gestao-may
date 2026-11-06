"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STATUS_PROJETO } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";
import { proximoNumero, renderizarContrato, type DadosContrato } from "@/lib/contrato";
import { getConfiguracoes } from "@/lib/configuracoes";
import type { Cliente, Contrato, ModeloContrato, Pagamento, Projeto } from "@/lib/types";
import { consultarDocumentoAutentique, criarDocumentoAutentique, situacao } from "@/lib/autentique";

export type FormState = { erro?: string; ok?: boolean };

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

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
// O briefing de 9 campos preenchido pela May saiu na migração 018: quem responde
// agora é o cliente, pelo link público (ver `liberarBriefing` no fim do arquivo).
// As colunas antigas continuam na tabela pra não perder o que já estava gravado.

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

/* ---------- Contrato gerado pelo sistema ---------- */


const dadosContratoSchema = z.object({
  hospedagem: z.enum(["contratada", "contratante"]).default("contratante"),
  hospedagem_valor: z.string().trim().max(20).optional(),
  hospedagem_dia: z.string().trim().max(2).optional(),
  hospedagem_backup: z.string().trim().max(40).optional(),
  textos: z.enum(["cliente", "contratada"]).default("cliente"),
  licencas: z.string().trim().max(120).optional(),
  licencas_periodo: z.string().trim().max(60).optional(),
  portfolio: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  testemunhas: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  representante: z.string().trim().max(160).optional(),
  pagamento_texto: z.string().trim().max(4000).optional(),
  anexo: z.string().trim().max(20000).optional(),
});

/**
 * Gera o contrato do projeto: junta corpo + anexo do tipo de serviço, troca as variáveis pelos
 * dados reais e congela o texto em `contratos.documento`. Não envia nada pra fora.
 */
export async function gerarContrato(projetoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = dadosContratoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const dados = parsed.data as DadosContrato;

  const supabase = await createClient();
  const [{ data: projeto }, config] = await Promise.all([
    supabase.from("projetos").select("*, clientes(*)").eq("id", projetoId).single<Projeto & { clientes: Cliente | null }>(),
    getConfiguracoes(),
  ]);
  if (!projeto?.clientes) return { erro: "Projeto ou cliente não encontrado." };
  if (!projeto.tipo) return { erro: "Defina o tipo de serviço do projeto antes de gerar o contrato." };
  if (!config.contrato_corpo) return { erro: "Rode a migração 010_contratos.sql no Supabase." };

  const [{ data: modelo }, { data: pagamentos }, { data: numeros }] = await Promise.all([
    supabase.from("modelos_contrato").select("*").eq("tipo_projeto", projeto.tipo).maybeSingle<ModeloContrato>(),
    supabase.from("pagamentos_view").select("*").eq("projeto_id", projetoId).order("vencimento").returns<Pagamento[]>(),
    supabase.from("contratos").select("numero").not("numero", "is", null).returns<Array<{ numero: string }>>(),
  ]);
  if (!modelo) return { erro: `Nenhum modelo de contrato pra "${projeto.tipo}". Cadastre em Configurações → Contratos.` };

  const hoje = hojeISO();
  const numero = proximoNumero((numeros ?? []).map((n) => n.numero), Number(hoje.slice(0, 4)));
  const documento = renderizarContrato({ config, cliente: projeto.clientes, projeto, modelo, pagamentos: pagamentos ?? [], numero, dados, hoje });

  const { error } = await supabase.from("contratos").insert({
    projeto_id: projetoId,
    status: "rascunho",
    numero,
    documento,
    dados,
    valor: projeto.valor_total,
  });
  if (error) return { erro: "Não foi possível salvar o contrato." };

  revalidar(projetoId, projeto.cliente_id);
  return { ok: true };
}

/** Salva edições feitas no texto do contrato (antes de enviar pra assinatura). */
export async function salvarDocumentoContrato(id: string, projetoId: string, formData: FormData) {
  const texto = z.string().trim().min(50).max(120000).safeParse(formData.get("documento"));
  if (!texto.success) return;
  const supabase = await createClient();
  await supabase.from("contratos").update({ documento: texto.data }).eq("id", id).eq("status", "rascunho");
  revalidar(projetoId);
}

/* ---------- Assinatura eletrônica (Autentique) ---------- */

/**
 * Envia o contrato pra assinatura: o PDF é gerado no navegador e chega aqui em base64.
 * Assinam o cliente e a contratada, ambos por e-mail.
 */
export async function enviarParaAssinatura(contratoId: string, projetoId: string, pdfBase64: string, nomeArquivo: string): Promise<FormState> {
  const supabase = await createClient();
  const [{ data: contrato }, config] = await Promise.all([
    supabase.from("contratos").select("*, projetos(nome, cliente_id, clientes(nome, empresa, email))").eq("id", contratoId).single<
      Contrato & { projetos: { nome: string; cliente_id: string; clientes: { nome: string; empresa: string | null; email: string | null } | null } | null }
    >(),
    getConfiguracoes(),
  ]);
  if (!contrato) return { erro: "Contrato não encontrado." };
  if (contrato.autentique_id) return { erro: "Este contrato já foi enviado pra assinatura." };

  const cliente = contrato.projetos?.clientes;
  if (!cliente?.email) return { erro: "O cliente não tem e-mail no cadastro — é por ele que o Autentique envia o convite." };
  const meuEmail = config.email_contratual ?? config.email_contato;
  if (!meuEmail) return { erro: "Preencha o e-mail do contrato em Configurações → Contratos." };

  const pdf = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ""), "base64");
  if (pdf.length < 1000) return { erro: "PDF inválido. Gere o documento de novo." };
  if (pdf.length > 5 * 1024 * 1024) return { erro: "O PDF passou de 5 MB, limite do plano gratuito do Autentique." };

  try {
    const doc = await criarDocumentoAutentique({
      nome: nomeArquivo.replace(/\.pdf$/i, ""),
      pdf,
      mensagem: `Contrato ${contrato.numero ?? ""} · ${contrato.projetos?.nome ?? ""}`.trim(),
      signatarios: [
        { email: cliente.email, name: cliente.empresa ?? cliente.nome, action: "SIGN" },
        { email: meuEmail, name: config.razao_social ?? config.nome ?? undefined, action: "SIGN" },
      ],
    });

    const s = situacao(doc);
    await supabase
      .from("contratos")
      .update({
        autentique_id: doc.id,
        autentique_dados: doc,
        link_documento: s.linkCliente ?? contrato.link_documento,
        status: "enviado",
        data_envio: hojeISO(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", contratoId);

    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível enviar pro Autentique." };
  }
}

/** Consulta o Autentique e atualiza o status do contrato (assinado / recusado). */
export async function atualizarStatusAssinatura(contratoId: string, projetoId: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: contrato } = await supabase.from("contratos").select("id, autentique_id, status").eq("id", contratoId).single<{ id: string; autentique_id: string | null; status: string }>();
  if (!contrato?.autentique_id) return { erro: "Este contrato não está no Autentique." };

  try {
    const doc = await consultarDocumentoAutentique(contrato.autentique_id);
    const s = situacao(doc);
    await supabase
      .from("contratos")
      .update({
        autentique_dados: doc,
        status: s.concluido ? "assinado" : contrato.status === "rascunho" ? "enviado" : contrato.status,
        data_assinatura: s.concluido ? (s.ultimaAssinatura ?? new Date().toISOString()).slice(0, 10) : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", contratoId);

    revalidar(projetoId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível consultar o Autentique." };
  }
}

/* ----------------------------------------------------------------------------
 * Briefing do cliente (migração 018). O antigo `salvarBriefing` continua acima
 * pros campos que a May preenchia; estes cuidam do link e das respostas dele.
 * -------------------------------------------------------------------------- */

/** Cria a linha se não existir e libera o link. Rascunho não abre pro cliente. */
export async function liberarBriefing(projetoId: string): Promise<FormState> {
  const supabase = await createClient();
  const agora = new Date().toISOString();

  const { data: existente } = await supabase
    .from("briefings")
    .select("id, status")
    .eq("projeto_id", projetoId)
    .maybeSingle<{ id: string; status: string }>();

  const { error } = existente
    ? await supabase
        .from("briefings")
        .update({ status: existente.status === "respondido" ? "respondido" : "enviado", enviado_em: agora, atualizado_em: agora })
        .eq("id", existente.id)
    : await supabase.from("briefings").insert({ projeto_id: projetoId, status: "enviado", enviado_em: agora });

  if (error) return { erro: "Não foi possível liberar o briefing." };
  revalidar(projetoId);
  return { ok: true };
}

/** Novo token: derruba o link antigo, caso tenha ido pra pessoa errada. */
export async function trocarTokenBriefing(projetoId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("briefings")
    .update({ token: crypto.randomUUID(), atualizado_em: new Date().toISOString() })
    .eq("projeto_id", projetoId);
  if (error) return { erro: "Não foi possível gerar um link novo." };
  revalidar(projetoId);
  return { ok: true };
}

/** Reabre pro cliente corrigir algo depois de enviado. */
export async function reabrirBriefing(projetoId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("briefings")
    .update({ status: "enviado", atualizado_em: new Date().toISOString() })
    .eq("projeto_id", projetoId);
  if (error) return { erro: "Não foi possível reabrir." };
  revalidar(projetoId);
  return { ok: true };
}

/*
 * A May corrigindo ou completando uma resposta do cliente — ela conversa por
 * WhatsApp e anota aqui, em vez de pedir pro cliente voltar no link.
 */
export async function ajustarRespostaBriefing(projetoId: string, chave: string, texto: string): Promise<FormState> {
  if (!/^[a-z0-9_]{1,60}$/.test(chave)) return { erro: "Pergunta inválida." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("briefings")
    .select("id, respostas")
    .eq("projeto_id", projetoId)
    .maybeSingle<{ id: string; respostas: Record<string, { t?: string; ns?: boolean }> }>();
  if (!data) return { erro: "Briefing não encontrado." };

  const respostas = { ...(data.respostas ?? {}) };
  if (texto.trim()) respostas[chave] = { t: texto.trim().slice(0, 5000) };
  else delete respostas[chave];

  const { error } = await supabase
    .from("briefings")
    .update({ respostas, atualizado_em: new Date().toISOString() })
    .eq("id", data.id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidar(projetoId);
  return { ok: true };
}
