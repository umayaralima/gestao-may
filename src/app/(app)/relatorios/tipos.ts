/* Visões, períodos e o contrato de dados da tela Relatórios (importado pelo server e pelo client). */

export const VISOES = [
  { id: "geral", label: "Visão geral" },
  { id: "receita", label: "Receita" },
  { id: "funil", label: "Funil" },
  { id: "producao", label: "Produção" },
] as const;
export type Visao = (typeof VISOES)[number]["id"];

export const PERIODOS = [
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "12m", label: "1 ano" },
  { id: "tudo", label: "Tudo" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["id"];

export type Serie = { nome: string; valor: number };
export type DadosRelatorio = {
  periodoLabel: string;
  receita: number;
  variacaoReceita: number | null;
  meta: number | null;
  metaAcumulada: number | null;
  metaPct: number | null;
  receitaMensal: Array<{ mes: string; receita: number; meta: number; previsto: number }>;
  mediaMensal: number;
  melhorMes: { mes: string; valor: number } | null;
  aReceber: number;
  vencido: number;
  receitaPorTipo: Serie[];
  receitaPorCliente: Array<Serie & { variacao: number | null }>;
  projetosFechados: number;
  variacaoFechados: number | null;
  ticketMedio: number;
  variacaoTicket: number | null;
  totalLeads: number;
  variacaoLeads: number | null;
  taxaConversao: number | null;
  variacaoConversao: number | null;
  cicloMedio: number | null;
  perdidos: number;
  funil: Array<{ etapa: string; valor: number; pct: number }>;
  leadsPorOrigem: Serie[];
  motivosPerda: Serie[];
  interacoes: number;
  variacaoInteracoes: number | null;
  atividadePorCanal: Serie[];
  atividadeSemanal: Array<{ semana: string; interacoes: number }>;
  semContato: Array<{ id: string; nome: string; ultima: string | null; dias: number | null }>;
  entregues: number;
  prazoMedio: number | null;
  noPrazoPct: number | null;
  etapasAbertas: number;
  etapasAtrasadas: number;
  projetosPorStatus: Serie[];
  tempoPorTipo: Array<Serie & { n: number }>;
  emProducao: Array<{ id: string; nome: string; cliente: string; status: string; total: number; feitas: number; atrasadas: number; prazo: string | null; diasPrazo: number | null }>;
};

