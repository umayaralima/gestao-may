import { formatBRL, formatDate, diffDias, hojeISO } from "@/lib/format";
import type { Configuracoes } from "@/lib/types";

/*
 * Modelos de mensagem: o mesmo motor de {{variaveis}} do contrato e da proposta,
 * aplicado aos textos curtos que a May repete todo dia (follow-up, cobrança,
 * pedido de material, aviso de entrega).
 *
 * A diferença pro contrato: aqui o texto NÃO é congelado. Mensagem é descartável —
 * renderiza, a May revisa, manda e acabou. Nada é guardado além da interação.
 */

export const SITUACOES = [
  { id: "lead", label: "Lead", descricao: "Primeiro contato e follow-up de quem ainda não é cliente" },
  { id: "proposta", label: "Proposta", descricao: "Envio e cobrança de resposta da proposta" },
  { id: "cobranca", label: "Cobrança", descricao: "Lembrete, atraso e link de pagamento" },
  { id: "projeto", label: "Projeto", descricao: "Pedido de material, andamento e entrega" },
  { id: "cliente", label: "Cliente", descricao: "Pós-venda, retomada de contato e depoimento" },
  { id: "outro", label: "Outro", descricao: "Qualquer mensagem avulsa" },
] as const;
export type Situacao = (typeof SITUACOES)[number]["id"];

export const CANAIS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "E-mail" },
  { id: "ambos", label: "Os dois" },
] as const;
export type Canal = (typeof CANAIS)[number]["id"];

export type ModeloMensagem = {
  id: string;
  nome: string;
  situacao: Situacao;
  canal: Canal;
  assunto: string | null;
  corpo: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
};

/*
 * Catálogo das variáveis, por situação. Serve pra duas coisas: resolver o texto
 * e montar a ajuda no editor de Configurações — uma fonte só, pra não divergirem.
 * As comuns valem em qualquer situação.
 */
export const VARIAVEIS_COMUNS = [
  { chave: "cliente_nome", descricao: "Nome do cliente (ou da empresa, quando tem)" },
  { chave: "cliente_primeiro_nome", descricao: "Só o primeiro nome — o que se usa no WhatsApp" },
  { chave: "contratada_nome", descricao: "Seu nome, como está em Configurações" },
  { chave: "contratada_titulo", descricao: "Seu título (ex.: desenvolvedora web)" },
  { chave: "meu_site", descricao: "Seu site, como está em Configurações" },
  { chave: "chave_pix", descricao: "Sua chave Pix" },
] as const;

export const VARIAVEIS_POR_SITUACAO: Record<Situacao, ReadonlyArray<{ chave: string; descricao: string }>> = {
  lead: [
    { chave: "servico", descricao: "Serviço de interesse do lead" },
    { chave: "valor_estimado", descricao: "Valor estimado do lead" },
  ],
  proposta: [
    { chave: "link_proposta", descricao: "Link público da proposta" },
    { chave: "valor", descricao: "Valor da proposta" },
    { chave: "validade", descricao: "Data até quando a proposta vale" },
    { chave: "numero", descricao: "Número da proposta (P-001/2026)" },
  ],
  cobranca: [
    { chave: "valor", descricao: "Valor da parcela" },
    { chave: "vencimento", descricao: "Data de vencimento" },
    { chave: "descricao", descricao: "Qual parcela é (ex.: entrada, 2ª parcela)" },
    { chave: "link_pagamento", descricao: "Link de cobrança, se já tiver sido gerado" },
    { chave: "dias_atraso", descricao: "Quantos dias de atraso (vazio se não venceu)" },
    { chave: "projeto", descricao: "Nome do projeto da parcela" },
  ],
  projeto: [
    { chave: "projeto", descricao: "Nome do projeto" },
    { chave: "etapa_atual", descricao: "Etapa em que o projeto está" },
    { chave: "prazo_entrega", descricao: "Data de entrega combinada" },
    { chave: "link_projeto", descricao: "Link do projeto (staging ou publicado)" },
  ],
  cliente: [
    { chave: "projeto", descricao: "Projeto mais recente do cliente" },
    { chave: "link_projeto", descricao: "Link do projeto mais recente" },
  ],
  outro: [],
};

export function variaveisDa(situacao: Situacao) {
  return [...VARIAVEIS_COMUNS, ...VARIAVEIS_POR_SITUACAO[situacao]];
}

/** Dados que a tela junta pra resolver o texto. Tudo opcional: o que faltar vira "". */
export type ContextoMensagem = {
  config: Configuracoes;
  clienteNome?: string | null;
  servico?: string | null;
  valor?: number | null;
  valorEstimado?: number | null;
  vencimento?: string | null;
  descricao?: string | null;
  linkPagamento?: string | null;
  linkProposta?: string | null;
  linkProjeto?: string | null;
  validade?: string | null;
  numero?: string | null;
  projeto?: string | null;
  etapaAtual?: string | null;
  prazoEntrega?: string | null;
};

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export function variaveisResolvidas(ctx: ContextoMensagem): Record<string, string> {
  const { config } = ctx;
  const nome = ctx.clienteNome?.trim() || "";
  const atraso = ctx.vencimento && ctx.vencimento < hojeISO() ? diffDias(ctx.vencimento, hojeISO()) : 0;

  return {
    cliente_nome: nome,
    cliente_primeiro_nome: nome ? primeiroNome(nome) : "",
    contratada_nome: config.nome ?? "Mayara Lima",
    contratada_titulo: config.titulo ?? "desenvolvedora web",
    meu_site: config.site ?? "",
    chave_pix: config.chave_pix ?? "",

    servico: ctx.servico ?? "",
    valor_estimado: ctx.valorEstimado != null ? formatBRL(ctx.valorEstimado) : "",

    valor: ctx.valor != null ? formatBRL(ctx.valor) : "",
    vencimento: ctx.vencimento ? formatDate(ctx.vencimento) : "",
    descricao: ctx.descricao ?? "",
    link_pagamento: ctx.linkPagamento ?? "",
    dias_atraso: atraso > 0 ? String(atraso) : "",

    link_proposta: ctx.linkProposta ?? "",
    validade: ctx.validade ? formatDate(ctx.validade) : "",
    numero: ctx.numero ?? "",

    projeto: ctx.projeto ?? "",
    etapa_atual: ctx.etapaAtual ?? "",
    prazo_entrega: ctx.prazoEntrega ? formatDate(ctx.prazoEntrega) : "",
    link_projeto: ctx.linkProjeto ?? "",
  };
}

/*
 * Resolve as {{variaveis}} e limpa o estrago de uma variável vazia:
 * uma linha que ficou só com a variável some, em vez de virar um buraco
 * no meio da mensagem. Variável desconhecida fica como está, pra ficar
 * visível que tem erro de digitação no modelo.
 */
export function renderizarMensagem(corpo: string, ctx: ContextoMensagem): string {
  const vars = variaveisResolvidas(ctx);

  return corpo
    .replace(/\{\{(\w+)\}\}/g, (original, chave: string) => (chave in vars ? vars[chave] : original))
    .split("\n")
    .filter((linha, i, linhas) => {
      // tira linha que ficou vazia porque a única coisa nela era uma variável sem valor
      const vazia = linha.trim() === "";
      const anteriorVazia = i > 0 && linhas[i - 1].trim() === "";
      return !(vazia && anteriorVazia);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Quais variáveis deste modelo não têm valor no contexto atual — a tela avisa antes de mandar. */
export function variaveisVazias(corpo: string, ctx: ContextoMensagem): string[] {
  const vars = variaveisResolvidas(ctx);
  const usadas = [...corpo.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  return [...new Set(usadas)].filter((chave) => chave in vars && !vars[chave]);
}

/** Link do WhatsApp com a mensagem pronta. Assume DDI 55 (mesmo padrão já usado no sistema). */
export function linkWhatsApp(whatsapp: string | null | undefined, texto: string): string | null {
  if (!whatsapp) return null;
  const numero = whatsapp.replace(/\D/g, "");
  if (numero.length < 10) return null;
  return `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`;
}

/** Link de e-mail. Usado como plano B quando o envio pelo Resend não se aplica. */
export function linkEmail(email: string | null | undefined, assunto: string | null, texto: string): string | null {
  if (!email) return null;
  const params = new URLSearchParams({ body: texto });
  if (assunto) params.set("subject", assunto);
  return `mailto:${email}?${params.toString()}`;
}
