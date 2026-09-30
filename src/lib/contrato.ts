import { FORMA_PAGAMENTO_LABEL, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import type { Cliente, Configuracoes, ModeloContrato, Pagamento, Projeto } from "@/lib/types";

/*
 * Monta o texto final do contrato: pega o corpo comum (Configurações) + o Anexo I do tipo de serviço
 * e troca as {{variaveis}} pelos dados reais. O resultado é congelado em `contratos.documento`,
 * pra que mudar o modelo depois não altere contrato já gerado.
 */

/* ---------- Valor por extenso (pt-BR) ---------- */
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const d = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CEM[c]);
  if (d) partes.push(d < 20 ? UNI[d] : [DEZ[Math.floor(d / 10)], UNI[d % 10]].filter(Boolean).join(" e "));
  return partes.join(" e ");
}

/** 1234.5 → "mil, duzentos e trinta e quatro reais e cinquenta centavos" */
export function porExtenso(valor: number): string {
  const inteiro = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);
  if (inteiro === 0 && centavos === 0) return "zero real";

  const grupos = [
    { div: 1_000_000_000, s: ["bilhão", "bilhões"] },
    { div: 1_000_000, s: ["milhão", "milhões"] },
    { div: 1_000, s: ["mil", "mil"] },
  ];
  let resto = inteiro;
  const partes: string[] = [];
  for (const g of grupos) {
    const q = Math.floor(resto / g.div);
    if (q > 0) {
      partes.push(g.div === 1000 && q === 1 ? "mil" : `${ate999(q)} ${q === 1 ? g.s[0] : g.s[1]}`);
      resto %= g.div;
    }
  }
  if (resto > 0) partes.push(ate999(resto));

  // Regra do português: "e" antes do último grupo quando ele é menor que 100 ou múltiplo de 100
  // (mil e quinhentos / doze mil e trezentos), vírgula nos demais (mil, duzentos e trinta e quatro).
  let texto = partes.join(", ");
  if (partes.length > 1 && resto > 0 && (resto < 100 || resto % 100 === 0)) {
    texto = texto.replace(/, ([^,]*)$/, " e $1");
  }
  texto += inteiro === 1 ? " real" : " reais";
  if (centavos > 0) texto += ` e ${ate999(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return texto;
}

/* ---------- Bloco de pagamento a partir das parcelas do projeto ---------- */

export function blocoPagamento(pagamentos: Pagamento[], total: number | null, chavePix: string | null): string {
  const lista = [...pagamentos].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  if (lista.length === 0) {
    return `O valor total será pago conforme condição acordada entre as partes${chavePix ? `. Chave PIX: ${chavePix}` : ""}.`;
  }

  const soma = lista.reduce((s, p) => s + Number(p.valor), 0);
  const pct = (v: number) => (total && total > 0 ? ` (${Math.round((Number(v) / total) * 100)}%)` : "");
  const linhas = lista.map((p, i) => {
    const rotulo = p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : `Parcela ${i + 1}`;
    const forma = p.forma_pagamento ? `, via ${FORMA_PAGAMENTO_LABEL[p.forma_pagamento as keyof typeof FORMA_PAGAMENTO_LABEL] ?? p.forma_pagamento}` : "";
    return `- ${rotulo}: ${formatBRL(p.valor)}${pct(p.valor)}, com vencimento em ${formatDate(p.vencimento)}${forma}.`;
  });

  const usaPix = lista.some((p) => p.forma_pagamento === "pix");
  const rodape = [
    lista.length > 1 ? `Total parcelado: ${formatBRL(soma)} em ${lista.length} pagamento(s).` : null,
    usaPix && chavePix ? `Chave PIX: ${chavePix}.` : null,
    lista.some((p) => p.forma_pagamento === "cartao") ? "As taxas de parcelamento no cartão são de responsabilidade do CONTRATANTE." : null,
  ].filter(Boolean);

  return [...linhas, ...(rodape.length ? ["", rodape.join(" ")] : [])].join("\n");
}

/* ---------- Opções escolhidas no formulário ---------- */

export type DadosContrato = {
  hospedagem: "contratada" | "contratante";
  hospedagem_valor?: string;
  hospedagem_dia?: string;
  hospedagem_backup?: string;
  textos: "cliente" | "contratada";
  licencas?: string;
  licencas_periodo?: string;
  portfolio: boolean;
  testemunhas: boolean;
  representante?: string;
  pagamento_texto?: string;
  anexo?: string;
};

function blocoHospedagem(d: DadosContrato): string {
  if (d.hospedagem === "contratada") {
    const valor = d.hospedagem_valor?.trim() || "[VALOR]";
    const dia = d.hospedagem_dia?.trim() || "[DIA]";
    const backup = d.hospedagem_backup?.trim() || "semanais";
    return `O site será hospedado em servidor VPS administrado pela CONTRATADA, mediante mensalidade de R$ ${valor}, cobrada a partir da publicação, com vencimento todo dia ${dia}. O serviço inclui armazenamento, certificado SSL e backups ${backup}. Atraso superior a 15 (quinze) dias corridos autoriza a suspensão do site. Em caso de cancelamento, a CONTRATADA fornecerá, mediante solicitação e quitação de eventuais débitos, backup completo do site para migração, em até 7 (sete) dias úteis.`;
  }
  return `A hospedagem será contratada e mantida diretamente pelo CONTRATANTE, em provedor compatível com WordPress, sendo dele a responsabilidade por pagamento, renovação, desempenho, segurança e disponibilidade do servidor.`;
}

function blocoAssinaturas(cliente: Cliente, config: Configuracoes, testemunhas: boolean): string {
  const linha = (rotulo: string, sub: string) => `__________________________________________\n${rotulo}\n${sub}`;
  const partes = [
    linha(`CONTRATADA: ${config.razao_social ?? config.empresa ?? "CONTRATADA"}`, `CNPJ ${config.cnpj ?? ""}`),
    linha(`CONTRATANTE: ${cliente.empresa ?? cliente.nome}`, cliente.documento ?? "CPF/CNPJ"),
  ];
  if (testemunhas) {
    partes.push(linha("TESTEMUNHA 1:", "CPF"), linha("TESTEMUNHA 2:", "CPF"));
  }
  return partes.join("\n\n");
}

const dataExtenso = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} de ${d.toLocaleDateString("pt-BR", { month: "long" })} de ${d.getFullYear()}`;
};

const ehCNPJ = (doc: string | null) => (doc ?? "").replace(/\D/g, "").length === 14;

/* ---------- Renderização ---------- */

export type EntradaContrato = {
  config: Configuracoes;
  cliente: Cliente;
  projeto: Projeto;
  modelo: ModeloContrato;
  pagamentos: Pagamento[];
  numero: string;
  dados: DadosContrato;
  hoje: string;
};

export function renderizarContrato(e: EntradaContrato): string {
  const { config, cliente, projeto, modelo, pagamentos, numero, dados, hoje } = e;
  const valor = projeto.valor_total !== null ? Number(projeto.valor_total) : null;
  const anexo = (dados.anexo?.trim() || modelo.anexo)
    .replace(/\{\{projeto_nome\}\}/g, projeto.nome)
    .replace(/\{\{valor\}\}/g, valor !== null ? formatBRL(valor) : "R$ [A DEFINIR]")
    .replace(/\{\{valor_extenso\}\}/g, valor !== null ? porExtenso(valor) : "a definir")
    .replace(/\{\{prazo_extenso\}\}/g, modelo.prazo_extenso);

  const vars: Record<string, string> = {
    titulo: modelo.titulo,
    numero,
    objeto: modelo.objeto,
    contratada_razao: config.razao_social ?? config.empresa ?? "",
    contratada_cnpj: config.cnpj ?? "",
    contratada_endereco: config.endereco_empresa ?? "",
    contratada_email: config.email_contratual ?? config.email_contato ?? "",
    cliente_nome: cliente.empresa ?? cliente.nome,
    cliente_tipo_documento: ehCNPJ(cliente.documento) ? "CNPJ" : "CPF",
    cliente_documento: cliente.documento ?? "[A INFORMAR]",
    cliente_endereco: cliente.endereco ?? "[A INFORMAR]",
    cliente_email: cliente.email ?? "[A INFORMAR]",
    cliente_telefone: cliente.whatsapp ?? "[A INFORMAR]",
    cliente_representante: dados.representante?.trim() ? `, neste ato representado(a) por ${dados.representante.trim()}` : "",
    pagamento: dados.pagamento_texto?.trim() || blocoPagamento(pagamentos, valor, config.chave_pix),
    hospedagem: blocoHospedagem(dados),
    portfolio: dados.portfolio ? "13.2. A presente autorização é concedida a título gratuito e por prazo indeterminado." : "13.2. O CONTRATANTE NÃO autoriza a divulgação do projeto no portfólio da CONTRATADA.",
    testemunhas_texto: dados.testemunhas ? ", juntamente com duas testemunhas" : "",
    cidade_foro: config.cidade_foro ?? "",
    data_extenso: dataExtenso(hoje),
    assinaturas: blocoAssinaturas(cliente, config, dados.testemunhas),
    projeto_nome: projeto.nome,
    valor: valor !== null ? formatBRL(valor) : "",
    valor_extenso: valor !== null ? porExtenso(valor) : "",
    prazo_extenso: modelo.prazo_extenso,
  };

  const corpo = (config.contrato_corpo ?? "").replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);

  // Opções ☐ do Anexo (textos e licenças): fica só a escolhida, sem caixinha
  const anexoFinal = anexo
    .replace(
      /^-? ?☐ Nenhuma\..*$/m,
      dados.licencas?.trim()
        ? `- ${dados.licencas.trim()}, pelo período de ${dados.licencas_periodo?.trim() || "[PERÍODO]"}, conforme Cláusula 9.2.`
        : "- Nenhuma. Todas as licenças premium são de responsabilidade do CONTRATANTE.",
    )
    .replace(/^-? ?☐ \[NOME DA LICENÇA\].*$/m, "")
    .replace(/^-? ?☐ Fornecidos pelo CONTRATANTE\.$/m, dados.textos === "cliente" ? "- Fornecidos pelo CONTRATANTE." : "")
    .replace(
      /^-? ?☐ Redação \(copy\) pela CONTRATADA.*$/m,
      dados.textos === "contratada" ? "- Redação (copy) pela CONTRATADA, com base no briefing, dentro das rodadas de revisão da Cláusula 5." : "",
    )
    // opções não escolhidas deixam linha vazia
    .replace(/^[ \t]*\n/gm, "\n");

  return `${corpo}\n\n${anexoFinal}`.replace(/\n{3,}/g, "\n\n").trim();
}

/** 001/2026 a partir do último número usado no ano. */
export function proximoNumero(numeros: Array<string | null>, ano: number): string {
  const doAno = numeros.filter((n): n is string => !!n && n.endsWith(`/${ano}`)).map((n) => parseInt(n.split("/")[0], 10) || 0);
  const proximo = (doAno.length ? Math.max(...doAno) : 0) + 1;
  return `${String(proximo).padStart(3, "0")}/${ano}`;
}
