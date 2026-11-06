/*
 * Briefing respondido pelo cliente, por link público.
 *
 * Duas decisões que explicam o resto do arquivo:
 *
 * 1. As perguntas vivem no banco (`briefing_perguntas`), não aqui. A May reescreve
 *    em Configurações sem depender de deploy. O código só sabe tipos e blocos.
 *
 * 2. "Não sei responder" é uma resposta, não um branco. A May disse que muito
 *    cliente não sabe quem é a própria persona — então em branco significa "não
 *    chegou lá" e `ns` significa "isso a gente constrói junto". São coisas
 *    diferentes e ela precisa distinguir ao abrir o briefing.
 */

export const TIPOS_PERGUNTA = ["texto_curto", "texto_longo", "sim_nao", "link"] as const;
export type TipoPergunta = (typeof TIPOS_PERGUNTA)[number];

export const BLOCOS = {
  A: { nome: "Landing page ou página de vendas", quando: "o projeto é landing page ou página de vendas" },
  B: { nome: "E-commerce", quando: "o projeto é e-commerce" },
  C: { nome: "Identidade visual básica", quando: 'o cliente responde "não" em "já tem logo e identidade visual"' },
} as const;
export type Bloco = keyof typeof BLOCOS;

export type PerguntaBriefing = {
  id: string;
  chave: string;
  secao: string;
  bloco: Bloco | null;
  texto: string;
  ajuda: string | null;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  ordem: number;
  ativa: boolean;
};

/** Uma resposta: texto preenchido, ou a marca de "não sei responder". */
export type Resposta = { t?: string; ns?: boolean };
export type Respostas = Record<string, Resposta>;

export const STATUS_BRIEFING = ["rascunho", "enviado", "respondido"] as const;
export type StatusBriefing = (typeof STATUS_BRIEFING)[number];

/** A chave da pergunta que decide se o bloco C entra. */
export const CHAVE_TEM_IDENTIDADE = "tem_identidade";

/*
 * Quais blocos valem pra este projeto. O A e o B vêm do tipo de serviço; o C vem
 * da resposta do próprio cliente, então muda enquanto ele preenche.
 *
 * A comparação é frouxa de propósito: `projetos.tipo` guarda o NOME do tipo de
 * serviço, que a May edita em Configurações. Casar por palavra sobrevive a ela
 * renomear "Landing Page" para "Landing page de captura".
 */
export function blocosAtivos(tipoProjeto: string | null, respostas: Respostas): Bloco[] {
  const tipo = (tipoProjeto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const blocos: Bloco[] = [];
  if (tipo.includes("landing") || tipo.includes("vendas")) blocos.push("A");
  if (tipo.includes("commerce") || tipo.includes("loja")) blocos.push("B");

  // Bloco C: só depois de responder "não". Enquanto estiver em branco ou "não sei",
  // não enchemos a tela com 5 perguntas que podem não servir.
  if (respostas[CHAVE_TEM_IDENTIDADE]?.t === "nao") blocos.push("C");

  return blocos;
}

/** As perguntas que este cliente deve ver, na ordem, já filtradas por bloco. */
export function perguntasVisiveis(
  todas: PerguntaBriefing[],
  tipoProjeto: string | null,
  respostas: Respostas,
): PerguntaBriefing[] {
  const blocos = blocosAtivos(tipoProjeto, respostas);
  return todas
    .filter((p) => p.ativa && (p.bloco === null || blocos.includes(p.bloco)))
    .sort((a, b) => a.ordem - b.ordem);
}

/** Agrupa na ordem das seções, preservando a ordem das perguntas. */
export function porSecao(perguntas: PerguntaBriefing[]): Array<{ secao: string; perguntas: PerguntaBriefing[] }> {
  const grupos: Array<{ secao: string; perguntas: PerguntaBriefing[] }> = [];
  for (const p of perguntas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.secao === p.secao) ultimo.perguntas.push(p);
    else grupos.push({ secao: p.secao, perguntas: [p] });
  }
  return grupos;
}

export const respondida = (r: Resposta | undefined) => !!r && (!!r.ns || !!r.t?.trim());

export type ProgressoBriefing = {
  total: number;
  respondidas: number;
  naoSei: number;
  percentual: number;
  faltamObrigatorias: PerguntaBriefing[];
};

/*
 * Progresso mostrado pro cliente e pra May. "Não sei" conta como respondida:
 * o cliente fez a parte dele, e penalizar a barra por isso só o desanimaria a
 * usar o botão — que é justamente o que dá o sinal útil pra May.
 */
export function progresso(perguntas: PerguntaBriefing[], respostas: Respostas): ProgressoBriefing {
  const total = perguntas.length;
  let respondidas = 0;
  let naoSei = 0;

  for (const p of perguntas) {
    const r = respostas[p.chave];
    if (respondida(r)) respondidas++;
    if (r?.ns) naoSei++;
  }

  return {
    total,
    respondidas,
    naoSei,
    percentual: total ? Math.round((respondidas / total) * 100) : 0,
    // Obrigatória não aceita "não sei": sem WhatsApp e e-mail o site não sai.
    faltamObrigatorias: perguntas.filter((p) => p.obrigatoria && !respostas[p.chave]?.t?.trim()),
  };
}

export const podeEnviar = (p: ProgressoBriefing) => p.faltamObrigatorias.length === 0;

/** Texto plano do briefing respondido — serve pro e-mail de aviso e pra copiar. */
export function briefingEmTexto(
  grupos: Array<{ secao: string; perguntas: PerguntaBriefing[] }>,
  respostas: Respostas,
): string {
  const partes: string[] = [];

  for (const g of grupos) {
    const linhas: string[] = [];
    for (const p of g.perguntas) {
      const r = respostas[p.chave];
      if (!respondida(r)) continue;
      linhas.push(`${p.texto}\n${r?.ns ? "— não sabe responder —" : rotuloResposta(p, r?.t ?? "")}`);
    }
    if (linhas.length) partes.push(`## ${g.secao}\n\n${linhas.join("\n\n")}`);
  }

  return partes.join("\n\n");
}

/** sim/nao viram texto legível; o resto sai como veio. */
export function rotuloResposta(pergunta: PerguntaBriefing, valor: string): string {
  if (pergunta.tipo !== "sim_nao") return valor;
  return valor === "sim" ? "Sim" : valor === "nao" ? "Não" : valor;
}
