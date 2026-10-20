import { createAdminClient } from "@/lib/supabase/admin";
import { MESES_PERIODICIDADE, type Periodicidade } from "@/lib/constantes";
import { hojeISO } from "@/lib/format";

/*
 * Lança as próximas ocorrências das despesas recorrentes. Roda no cron diário.
 * A despesa marcada como recorrente é o "molde": quando a data dela (ou da última ocorrência)
 * já passou, cria a seguinte. Nunca cria duas vezes a mesma data.
 */

type Molde = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  forma_pagamento: string | null;
  fornecedor: string | null;
  projeto_id: string | null;
  periodicidade: Periodicidade | null;
  recorrencia_ate: string | null;
  observacoes: string | null;
};

function somarMeses(iso: string, meses: number) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1 + meses, 1);
  // mantém o dia do mês quando existir (31 de janeiro + 1 mês = 28/29 de fevereiro)
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function gerarDespesasRecorrentes(): Promise<{ criadas: number; erro?: string }> {
  const supabase = createAdminClient();
  const hoje = hojeISO();

  const { data: moldes, error } = await supabase.from("despesas").select("*").eq("recorrente", true).returns<Molde[]>();
  if (error) return { criadas: 0, erro: error.message };

  let criadas = 0;
  for (const molde of moldes ?? []) {
    if (!molde.periodicidade) continue;
    const passo = MESES_PERIODICIDADE[molde.periodicidade];

    // última ocorrência já lançada a partir deste molde
    const { data: ultima } = await supabase
      .from("despesas")
      .select("data")
      .eq("origem_id", molde.id)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle<{ data: string }>();

    let proxima = somarMeses(ultima?.data ?? molde.data, passo);

    // cria tudo que já venceu (se ficou meses sem abrir o sistema, não perde lançamento)
    while (proxima <= hoje && (!molde.recorrencia_ate || proxima <= molde.recorrencia_ate)) {
      const { error: erroInsert } = await supabase.from("despesas").insert({
        descricao: molde.descricao,
        categoria: molde.categoria,
        valor: molde.valor,
        data: proxima,
        forma_pagamento: molde.forma_pagamento,
        fornecedor: molde.fornecedor,
        projeto_id: molde.projeto_id,
        observacoes: molde.observacoes,
        recorrente: false,
        origem_id: molde.id,
      });
      if (erroInsert) break;
      criadas++;
      proxima = somarMeses(proxima, passo);
    }
  }

  return { criadas };
}
