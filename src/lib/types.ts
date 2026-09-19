import type { CategoriaTarefa, EtapaLead, Prioridade, StatusProjeto, TipoPagamento } from "./constantes";

export type Cliente = {
  id: string;
  nome: string;
  empresa: string | null;
  nicho: string | null;
  email: string | null;
  whatsapp: string | null;
  origem: string | null;
  status: "ativo" | "inativo";
  observacoes: string | null;
  lead_id: string | null;
  proximo_followup: string | null;
  nota_followup: string | null;
  criado_em: string;
};

export type Projeto = {
  id: string;
  cliente_id: string;
  nome: string;
  /** Nome de um serviço em tipos_projeto (texto livre). */
  tipo: string | null;
  status: StatusProjeto;
  valor_total: number | null;
  data_inicio: string | null;
  prazo_entrega: string | null;
  link_projeto: string | null;
  observacoes: string | null;
  criado_em: string;
};

export type StatusPagamento = "pendente" | "pago" | "atrasado";

export type Pagamento = {
  id: string;
  projeto_id: string;
  tipo: TipoPagamento | null;
  valor: number;
  vencimento: string;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  criado_em: string;
  /** Vem da view `pagamentos_view`. */
  status: StatusPagamento;
};

export type TipoProjeto = {
  id: string;
  nome: string;
  ordem: number;
  criado_em: string;
};

export type Briefing = {
  id: string;
  projeto_id: string;
  objetivo: string | null;
  publico_alvo: string | null;
  referencias: string | null;
  tem_identidade_visual: boolean;
  cores_preferidas: string | null;
  conteudo_disponivel: boolean;
  funcionalidades: string | null;
  concorrentes: string | null;
  orcamento_aproximado: number | null;
  respostas_extra: Record<string, unknown> | null;
  criado_em: string;
};

export type Contrato = {
  id: string;
  projeto_id: string;
  status: "rascunho" | "enviado" | "assinado";
  link_documento: string | null;
  data_envio: string | null;
  data_assinatura: string | null;
  criado_em: string;
};

export type Lead = {
  id: string;
  nome: string;
  empresa: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  origem: string | null;
  servico_interesse: string | null;
  valor_estimado: number | null;
  etapa: EtapaLead;
  prioridade: Prioridade;
  motivo_perda: string | null;
  proximo_followup: string | null;
  nota_followup: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Interacao = {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  data: string;
  canal: string | null;
  resumo: string;
  criado_em: string;
};

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  cliente_id: string | null;
  lead_id: string | null;
  categoria: CategoriaTarefa;
  prioridade: Prioridade;
  vencimento: string | null;
  concluida_em: string | null;
  criado_em: string;
};
