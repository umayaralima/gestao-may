"use server";

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUrl } from "@/lib/enviar-resumo";
import { enviarEmail } from "@/lib/resumo-diario";
import { getConfiguracoes } from "@/lib/configuracoes";
import {
  briefingEmTexto,
  perguntasVisiveis,
  porSecao,
  progresso,
  type PerguntaBriefing,
  type Respostas,
} from "@/lib/briefing";

/*
 * Ações do briefing público. Rodam sem sessão (cliente não tem login), então usam
 * o client de serviço — e por isso o token é a única credencial: todo acesso aqui
 * começa procurando o briefing PELO token, nunca por id vindo do cliente.
 */

const TOKEN = /^[0-9a-f-]{36}$/i;

type BriefingDoToken = {
  id: string;
  status: string;
  respostas: Respostas;
  projetos: { id: string; nome: string; tipo: string | null; clientes: { nome: string; empresa: string | null } | null } | null;
};

async function buscarPorToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("briefings")
    .select("id, status, respostas, projetos(id, nome, tipo, clientes(nome, empresa))")
    .eq("token", token)
    .maybeSingle<BriefingDoToken>();
  // Rascunho não abre por link: o briefing só existe pro cliente depois de enviado.
  return data && data.status !== "rascunho" ? data : null;
}

/*
 * Salva UMA resposta. O cliente não aperta "salvar" — cada campo grava ao sair do
 * foco. Com 49 perguntas, ninguém responde de uma sentada: perder o que já foi
 * digitado é o que faz o briefing nunca voltar.
 *
 * A gravação é por chave dentro do jsonb, então duas abas abertas não se
 * sobrescrevem inteiras — no pior caso disputam a mesma pergunta.
 */
export async function salvarResposta(
  token: string,
  chave: string,
  valor: { t?: string; ns?: boolean },
): Promise<{ erro?: string; ok?: boolean }> {
  const briefing = await buscarPorToken(token);
  if (!briefing) return { erro: "Briefing não encontrado." };
  if (briefing.status === "respondido") return { erro: "Este briefing já foi enviado." };
  if (!/^[a-z0-9_]{1,60}$/.test(chave)) return { erro: "Pergunta inválida." };

  const limpo: { t?: string; ns?: boolean } = {};
  if (valor.ns) limpo.ns = true;
  else if (valor.t?.trim()) limpo.t = valor.t.trim().slice(0, 5000);

  const supabase = createAdminClient();
  const respostas = { ...(briefing.respostas ?? {}) };
  if (limpo.t || limpo.ns) respostas[chave] = limpo;
  else delete respostas[chave];

  const { error } = await supabase
    .from("briefings")
    .update({ respostas, atualizado_em: new Date().toISOString() })
    .eq("id", briefing.id);

  return error ? { erro: "Não foi possível salvar." } : { ok: true };
}

/** Marca a primeira abertura, pra May saber que o cliente ao menos olhou. */
export async function registrarAbertura(token: string) {
  if (!TOKEN.test(token)) return;
  const supabase = createAdminClient();
  await supabase.from("briefings").update({ vista_em: new Date().toISOString() }).eq("token", token).is("vista_em", null);
}

/*
 * Envio final. Confere as obrigatórias no servidor — o botão desabilitado na tela
 * é conveniência, não garantia.
 */
export async function enviarBriefing(token: string): Promise<{ erro?: string; ok?: boolean }> {
  const briefing = await buscarPorToken(token);
  if (!briefing) return { erro: "Briefing não encontrado." };
  if (briefing.status === "respondido") return { erro: "Este briefing já foi enviado." };

  const supabase = createAdminClient();
  const { data: perguntas } = await supabase
    .from("briefing_perguntas")
    .select("*")
    .order("ordem")
    .returns<PerguntaBriefing[]>();

  const visiveis = perguntasVisiveis(perguntas ?? [], briefing.projetos?.tipo ?? null, briefing.respostas ?? {});
  const p = progresso(visiveis, briefing.respostas ?? {});
  if (p.faltamObrigatorias.length) {
    return { erro: `Ainda falta responder: ${p.faltamObrigatorias.map((q) => q.texto).join(" · ")}` };
  }

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("briefings")
    .update({ status: "respondido", respondido_em: agora, atualizado_em: agora })
    .eq("id", briefing.id);
  if (error) return { erro: "Não foi possível enviar. Tente de novo." };

  // O e-mail sai depois da resposta: se o Resend falhar, o cliente não vê erro
  // num briefing que já foi gravado.
  after(async () => {
    const config = await getConfiguracoes();
    const destino = config.resumo_email ?? config.email_contato;
    if (!destino) return;

    const cliente = briefing.projetos?.clientes?.empresa ?? briefing.projetos?.clientes?.nome ?? "Cliente";
    const projeto = briefing.projetos?.nome ?? "projeto";
    const texto = briefingEmTexto(porSecao(visiveis), briefing.respostas ?? {});

    await enviarEmail({
      para: destino,
      assunto: `Briefing respondido — ${cliente}`,
      html: `
        <p><strong>${cliente}</strong> respondeu o briefing do projeto <strong>${projeto}</strong>.</p>
        <p>${p.respondidas} de ${p.total} perguntas${p.naoSei ? `, sendo ${p.naoSei} marcadas como "não sei responder"` : ""}.</p>
        <p><a href="${baseUrl()}/projetos/${briefing.projetos?.id}?aba=briefing">Abrir no sistema</a></p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px">${texto.replace(/[<>]/g, "")}</pre>
      `,
    });
  });

  return { ok: true };
}
