import type { StatusProjeto, TipoPagamento, TipoProjeto } from "./constantes";

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
  tipo: TipoProjeto | null;
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
