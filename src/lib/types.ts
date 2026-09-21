import type { EtapaLead, GrupoCategoria, FormaPagamento, Prioridade, StatusProjeto, TipoPagamento } from "./constantes";

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
  documento: string | null;
  endereco: string | null;
  instagram: string | null;
  site: string | null;
  contato_preferido: "whatsapp" | "email" | "instagram" | null;
  acessos: string | null;
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
  projeto_id: string | null;
  /** nome da categoria (tabela categorias_tarefa) */
  categoria: string;
  prioridade: Prioridade;
  vencimento: string | null;
  concluida_em: string | null;
  criado_em: string;
};

export type Configuracoes = {
  id: 1;
  nome: string | null;
  titulo: string | null;
  email_contato: string | null;
  telefone: string | null;
  empresa: string | null;
  cnpj: string | null;
  site: string | null;
  meta_mensal: number | null;
  dias_aviso_vencimento: number;
  dias_negocio_parado: number;
  forma_pagamento_preferida: FormaPagamento;
  chave_pix: string | null;
  atualizado_em: string;
};

export type CategoriaTarefa = {
  id: string;
  nome: string;
  grupo: GrupoCategoria;
  icone: string;
  ordem: number;
};
