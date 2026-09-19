import type { StatusProjeto, TipoPagamento } from "./constantes";

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
