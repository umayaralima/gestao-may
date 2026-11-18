"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUrl } from "@/lib/enviar-resumo";
import { enviarEmail } from "@/lib/resumo-diario";
import { getConfiguracoes } from "@/lib/configuracoes";
import { PORTAL_FECHADO } from "@/lib/portal";
import type { StatusProjeto } from "@/lib/constantes";

/*
 * Ações do portal público. Rodam sem sessão, então usam o client de serviço — e
 * por isso todo acesso começa procurando o projeto PELO token. Nenhum id vindo
 * do navegador é usado sem antes conferir que pertence a esse projeto: é o que
 * impede alguém com um link válido de aprovar coisa de outro cliente.
 */

const TOKEN = /^[0-9a-f-]{36}$/i;
const UUID = /^[0-9a-f-]{36}$/i;

type ProjetoDoToken = {
  id: string;
  nome: string;
  status: StatusProjeto;
  cliente_id: string;
  clientes: { nome: string; empresa: string | null } | null;
};

async function projetoPorToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projetos")
    .select("id, nome, status, cliente_id, clientes(nome, empresa)")
    .eq("portal_token", token)
    .maybeSingle<ProjetoDoToken>();
  return data && !PORTAL_FECHADO.includes(data.status) ? data : null;
}

const nomeDoCliente = (p: ProjetoDoToken) => p.clientes?.empresa ?? p.clientes?.nome ?? "Cliente";

async function avisar(assunto: string, html: string) {
  const config = await getConfiguracoes();
  const destino = config.resumo_email ?? config.email_contato;
  if (!destino) return;
  await enviarEmail({ para: destino, assunto, html });
}

/*
 * Aprovar ou pedir ajuste. O nome é pedido porque o cliente costuma repassar o
 * link pra sócio ou marido: sem isso, "aprovado" não diz por quem.
 * "ajuste" não é recusa — ela corrige e abre um pedido novo.
 */
export async function decidirAprovacao(
  token: string,
  aprovacaoId: string,
  decisao: "aprovado" | "ajuste",
  nome: string,
  comentario: string,
): Promise<{ erro?: string; ok?: boolean }> {
  const projeto = await projetoPorToken(token);
  if (!projeto) return { erro: "Projeto não encontrado." };
  if (!UUID.test(aprovacaoId)) return { erro: "Pedido inválido." };

  const quem = nome.trim().slice(0, 120);
  if (!quem) return { erro: "Escreva seu nome pra eu saber quem aprovou." };

  const texto = comentario.trim().slice(0, 4000);
  if (decisao === "ajuste" && !texto) return { erro: "Conte o que você quer que eu ajuste." };

  const supabase = createAdminClient();

  // Confere que a aprovação é DESTE projeto e ainda está aberta.
  const { data: aprovacao } = await supabase
    .from("aprovacoes")
    .select("id, titulo, status")
    .eq("id", aprovacaoId)
    .eq("projeto_id", projeto.id)
    .maybeSingle<{ id: string; titulo: string; status: string }>();
  if (!aprovacao) return { erro: "Pedido não encontrado." };
  if (aprovacao.status !== "aguardando") return { erro: "Este pedido já foi respondido." };

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("aprovacoes")
    .update({ status: decisao, comentario_cliente: texto || null, decidido_por: quem, decidido_em: agora })
    .eq("id", aprovacao.id)
    .eq("status", "aguardando"); // não deixa duas abas decidirem duas vezes
  if (error) return { erro: "Não foi possível registrar. Tente de novo." };

  const resumo =
    decisao === "aprovado"
      ? `Aprovou "${aprovacao.titulo}" pelo portal (${quem})${texto ? `: ${texto}` : ""}`
      : `Pediu ajuste em "${aprovacao.titulo}" pelo portal (${quem}): ${texto}`;

  await supabase.from("interacoes").insert({
    cliente_id: projeto.cliente_id,
    data: agora.slice(0, 10),
    canal: "portal",
    resumo,
  });

  revalidatePath(`/projetos/${projeto.id}`);

  after(() =>
    avisar(
      `${decisao === "aprovado" ? "Aprovado" : "Ajuste pedido"} — ${nomeDoCliente(projeto)}`,
      `<p><strong>${nomeDoCliente(projeto)}</strong> ${decisao === "aprovado" ? "aprovou" : "pediu ajuste em"} <strong>${aprovacao.titulo}</strong> no projeto ${projeto.nome}.</p>
       <p>Quem respondeu: ${quem}</p>
       ${texto ? `<p>“${texto.replace(/[<>]/g, "")}”</p>` : ""}
       <p><a href="${baseUrl()}/projetos/${projeto.id}?aba=portal">Abrir no sistema</a></p>`,
    ),
  );

  return { ok: true };
}

/*
 * Recado ou material. Vira interação com canal 'portal', então entra na timeline
 * do cliente junto com WhatsApp e e-mail — sem tabela nova e sem um "chat" pra
 * ela ter que acompanhar.
 */
export async function enviarRecado(
  token: string,
  texto: string,
  link: string,
): Promise<{ erro?: string; ok?: boolean }> {
  const projeto = await projetoPorToken(token);
  if (!projeto) return { erro: "Projeto não encontrado." };

  const recado = texto.trim().slice(0, 4000);
  const url = link.trim().slice(0, 500);
  if (!recado && !url) return { erro: "Escreva um recado ou cole o link do material." };
  if (url && !/^https?:\/\/\S+$/i.test(url)) return { erro: "O link precisa começar com https://" };

  const supabase = createAdminClient();
  const agora = new Date();
  const { error } = await supabase.from("interacoes").insert({
    cliente_id: projeto.cliente_id,
    data: agora.toISOString().slice(0, 10),
    canal: "portal",
    resumo: [recado, url && `Material: ${url}`].filter(Boolean).join(" — ").slice(0, 4000),
  });
  if (error) return { erro: "Não foi possível enviar. Tente de novo." };

  revalidatePath(`/projetos/${projeto.id}`);
  revalidatePath(`/clientes/${projeto.cliente_id}`);

  after(() =>
    avisar(
      `Recado pelo portal — ${nomeDoCliente(projeto)}`,
      `<p><strong>${nomeDoCliente(projeto)}</strong> mandou um recado pelo portal do projeto ${projeto.nome}:</p>
       ${recado ? `<p>“${recado.replace(/[<>]/g, "")}”</p>` : ""}
       ${url ? `<p>Material: <a href="${url}">${url.replace(/[<>]/g, "")}</a></p>` : ""}
       <p><a href="${baseUrl()}/projetos/${projeto.id}?aba=portal">Abrir no sistema</a></p>`,
    ),
  );

  return { ok: true };
}
