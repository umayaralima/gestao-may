import { formatBRL, formatDate } from "@/lib/format";
import { porExtenso } from "@/lib/contrato";
import type { Cliente, Configuracoes, Lead, ModeloContrato } from "@/lib/types";

/*
 * Proposta comercial: mesmo esquema do contrato (corpo em Configurações + {{variaveis}}),
 * mas voltada ao lead. O escopo reaproveita o Anexo I do modelo do tipo de serviço — assim
 * o que foi proposto é exatamente o que vai pro contrato.
 */

export type DadosProposta = {
  pagamento_texto?: string;
  escopo?: string;
  apresentacao?: string;
  observacoes?: string;
};

/** Condições de pagamento mais usadas, prontas pra escolher no modal. */
export const CONDICOES = [
  { id: "50_50", label: "50% + 50%", monta: (v: number) => [`- 50% (${formatBRL(v / 2)}) na assinatura do contrato, a título de sinal e reserva de agenda.`, `- 50% (${formatBRL(v / 2)}) na aprovação final, antes da publicação.`] },
  { id: "entrada_2x", label: "Entrada + 2x", monta: (v: number) => [`- Entrada de ${formatBRL(v / 3)} na assinatura do contrato.`, `- 2 parcelas de ${formatBRL(v / 3)}, com vencimento a cada 30 dias.`] },
  { id: "entrada_3x", label: "Entrada + 3x", monta: (v: number) => [`- Entrada de ${formatBRL(v / 4)} na assinatura do contrato.`, `- 3 parcelas de ${formatBRL(v / 4)}, com vencimento a cada 30 dias.`] },
  { id: "avista", label: "À vista", monta: (v: number) => [`- Pagamento único de ${formatBRL(v)} na assinatura do contrato.`] },
  { id: "cartao", label: "Cartão parcelado", monta: (v: number) => [`- ${formatBRL(v)} por link de pagamento, parcelado em até 12x no cartão (taxas de parcelamento por conta do contratante).`] },
] as const;
export type CondicaoId = (typeof CONDICOES)[number]["id"];

export function blocoPagamentoProposta(condicao: CondicaoId, valor: number, chavePix: string | null) {
  const escolhida = CONDICOES.find((c) => c.id === condicao) ?? CONDICOES[0];
  const linhas = escolhida.monta(valor);
  const pix = chavePix && condicao !== "cartao" ? [``, `Pagamento por Pix (chave ${chavePix}) ou link de cartão, como preferir.`] : [];
  return [...linhas, ...pix].join("\n");
}

/** Limpa o Anexo I do contrato pra virar escopo de proposta (tira cabeçalho e itens internos). */
export function escopoDoModelo(modelo: ModeloContrato | null): string {
  if (!modelo) return "- A combinar.";
  const anexo = modelo.anexo;
  const incluso = anexo.match(/### 1\. O QUE ESTÁ INCLUSO\n([\s\S]*?)(?=\n### |\n*$)/)?.[1]?.trim();
  const naoIncluso = anexo.match(/### 5\. O QUE NÃO ESTÁ INCLUSO\n([\s\S]*?)(?=\n### |\n*$)/)?.[1]?.trim();
  const material = anexo.match(/### 4\. MATERIAL A SER FORNECIDO PELO CONTRATANTE\n([\s\S]*?)(?=\n### |\n*$)/)?.[1]?.trim();

  return [
    incluso ?? "- A combinar.",
    material ? `\n### O QUE PRECISO DE VOCÊ\n${material}` : "",
    naoIncluso ? `\n### NÃO ESTÁ INCLUSO\n${naoIncluso}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const dataExtenso = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} de ${d.toLocaleDateString("pt-BR", { month: "long" })} de ${d.getFullYear()}`;
};

export type EntradaProposta = {
  config: Configuracoes;
  destino: Lead | Cliente;
  modelo: ModeloContrato | null;
  titulo: string;
  numero: string;
  valor: number;
  prazoExtenso: string;
  validade: string;
  dados: DadosProposta;
  hoje: string;
};

export function renderizarProposta(e: EntradaProposta): string {
  const { config, destino, modelo, titulo, numero, valor, prazoExtenso, validade, dados, hoje } = e;
  const nome = ("empresa" in destino && destino.empresa) || destino.nome;
  const primeiro = destino.nome.trim().split(/\s+/)[0];
  const contato = [destino.email, destino.whatsapp, "instagram" in destino && destino.instagram ? `@${destino.instagram}` : null].filter(Boolean).join(" · ");

  const vars: Record<string, string> = {
    titulo,
    numero,
    data_extenso: dataExtenso(hoje),
    cliente_nome: nome,
    cliente_primeiro_nome: primeiro,
    cliente_contato: contato || "—",
    contratada_nome: config.nome ?? "Mayara Lima",
    contratada_titulo: config.titulo ?? "desenvolvedora web",
    contratada_email: config.email_contratual ?? config.email_contato ?? "",
    contratada_telefone: config.telefone ? ` ou no WhatsApp ${config.telefone}` : "",
    escopo: dados.escopo?.trim() || escopoDoModelo(modelo),
    prazo_extenso: prazoExtenso,
    valor: formatBRL(valor),
    valor_extenso: porExtenso(valor),
    pagamento: dados.pagamento_texto?.trim() || "",
    validade: formatDate(validade),
  };

  let texto = (config.proposta_corpo ?? "").replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
  if (dados.apresentacao?.trim()) {
    texto = texto.replace(/### APRESENTAÇÃO\n[\s\S]*?(?=\n### )/, `### APRESENTAÇÃO\n${dados.apresentacao.trim()}\n`);
  }
  if (dados.observacoes?.trim()) texto += `\n\n### OBSERVAÇÕES\n${dados.observacoes.trim()}`;
  return texto.replace(/\n{3,}/g, "\n\n").trim();
}

/** P-001/2026 */
export function proximoNumeroProposta(numeros: Array<string | null>, ano: number): string {
  const doAno = numeros.filter((n): n is string => !!n && n.endsWith(`/${ano}`)).map((n) => parseInt(n.replace(/\D/g, "").slice(0, 3), 10) || 0);
  return `P-${String((doAno.length ? Math.max(...doAno) : 0) + 1).padStart(3, "0")}/${ano}`;
}
