/*
 * Gera o PDF do contrato no navegador, a partir do markdown simples guardado em `contratos.documento`.
 * Feito no cliente de propósito: evita fontes/binários em serverless e o mesmo arquivo servirá pro Autentique.
 *
 * Convenções do markdown: "# " título, "## " subtítulo, "### " cláusula, "- " item,
 * "**texto**" negrito, "____" linha de assinatura.
 */

const A4 = { largura: 210, altura: 297 };
const MARGEM = { topo: 22, base: 20, esq: 20, dir: 20 };
const LARGURA_UTIL = A4.largura - MARGEM.esq - MARGEM.dir;

export async function gerarPdfContrato(documento: string, nomeArquivo: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEM.topo;

  const novaPaginaSePreciso = (altura: number) => {
    if (y + altura > A4.altura - MARGEM.base) {
      doc.addPage();
      y = MARGEM.topo;
    }
  };

  const escrever = (texto: string, opcoes: { tamanho?: number; estilo?: "normal" | "bold"; alinhar?: "left" | "center" | "justify"; espacoAntes?: number; espacoDepois?: number; recuo?: number }) => {
    const { tamanho = 10, estilo = "normal", alinhar = "justify", espacoAntes = 0, espacoDepois = 2, recuo = 0 } = opcoes;
    doc.setFont("times", estilo);
    doc.setFontSize(tamanho);
    const largura = LARGURA_UTIL - recuo;
    const linhas = doc.splitTextToSize(texto, largura) as string[];
    const alturaLinha = tamanho * 0.45;

    y += espacoAntes;
    for (const linha of linhas) {
      novaPaginaSePreciso(alturaLinha);
      const x = alinhar === "center" ? A4.largura / 2 : MARGEM.esq + recuo;
      doc.text(linha, x, y, { align: alinhar === "center" ? "center" : "left" });
      y += alturaLinha;
    }
    y += espacoDepois;
  };

  // negrito inline: parte o parágrafo em pedaços e escreve na mesma linha quando couber
  const escreverComNegrito = (texto: string, recuo = 0) => {
    if (!texto.includes("**")) return escrever(texto, { recuo });
    const partes = texto.split(/(\*\*[^*]+\*\*)/).filter(Boolean);
    doc.setFontSize(10);
    const alturaLinha = 4.5;
    let x = MARGEM.esq + recuo;
    novaPaginaSePreciso(alturaLinha);
    for (const parte of partes) {
      const negrito = parte.startsWith("**");
      const limpo = negrito ? parte.slice(2, -2) : parte;
      doc.setFont("times", negrito ? "bold" : "normal");
      for (const palavra of limpo.split(/(\s+)/)) {
        if (!palavra) continue;
        const largura = doc.getTextWidth(palavra);
        if (x + largura > A4.largura - MARGEM.dir) {
          y += alturaLinha;
          novaPaginaSePreciso(alturaLinha);
          x = MARGEM.esq + recuo;
          if (/^\s+$/.test(palavra)) continue;
        }
        doc.text(palavra, x, y);
        x += largura;
      }
    }
    y += alturaLinha + 2;
  };

  for (const linhaBruta of documento.split("\n")) {
    const linha = linhaBruta.trimEnd();

    if (!linha.trim()) {
      y += 2;
      continue;
    }
    if (linha.startsWith("# ")) {
      escrever(linha.slice(2), { tamanho: 14, estilo: "bold", alinhar: "center", espacoDepois: 1 });
      continue;
    }
    if (linha.startsWith("## ")) {
      escrever(linha.slice(3), { tamanho: 12, estilo: "bold", alinhar: "center", espacoDepois: 3 });
      continue;
    }
    if (linha.startsWith("### ")) {
      novaPaginaSePreciso(12);
      escrever(linha.slice(4), { tamanho: 10.5, estilo: "bold", alinhar: "left", espacoAntes: 3, espacoDepois: 1.5 });
      continue;
    }
    if (linha.startsWith("- ")) {
      escreverComNegrito(`•  ${linha.slice(2)}`, 5);
      continue;
    }
    if (/^_{6,}$/.test(linha.trim())) {
      novaPaginaSePreciso(18);
      y += 8;
      doc.setDrawColor(60);
      doc.line(MARGEM.esq, y, MARGEM.esq + 85, y);
      y += 4;
      continue;
    }
    escreverComNegrito(linha);
  }

  // rodapé com paginação
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${p}/${total}`, A4.largura - MARGEM.dir, A4.altura - 10, { align: "right" });
    doc.setTextColor(0);
  }

  doc.setProperties({ title: nomeArquivo });
  return doc.output("blob");
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
