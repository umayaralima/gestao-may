export const STATUS_PROJETO = [
  "briefing",
  "orcamento_enviado",
  "aprovado",
  "em_desenvolvimento",
  "em_revisao",
  "entregue",
  "concluido",
  "cancelado",
] as const;
export type StatusProjeto = (typeof STATUS_PROJETO)[number];

export const STATUS_PROJETO_LABEL: Record<StatusProjeto, string> = {
  briefing: "Briefing",
  orcamento_enviado: "Orçamento enviado",
  aprovado: "Aprovado",
  em_desenvolvimento: "Em desenvolvimento",
  em_revisao: "Em revisão",
  entregue: "Entregue",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** "Ativo" pra dashboard: entre orçamento enviado e em revisão. */
export const STATUS_PROJETO_ATIVO: StatusProjeto[] = [
  "orcamento_enviado",
  "aprovado",
  "em_desenvolvimento",
  "em_revisao",
];

export const TIPO_PAGAMENTO = ["entrada", "parcela", "pagamento_unico", "final"] as const;
export type TipoPagamento = (typeof TIPO_PAGAMENTO)[number];

export const TIPO_PAGAMENTO_LABEL: Record<TipoPagamento, string> = {
  entrada: "Entrada",
  parcela: "Parcela",
  pagamento_unico: "Pagamento único",
  final: "Final",
};

export const FORMAS_PAGAMENTO = ["pix", "boleto", "cartao", "transferencia", "outro"] as const;
export const FORMA_PAGAMENTO_LABEL: Record<(typeof FORMAS_PAGAMENTO)[number], string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

export const STATUS_CLIENTE = ["ativo", "inativo"] as const;

export const ORIGENS_CLIENTE = ["indicacao", "instagram", "site", "linkedin", "outro"] as const;
export const ORIGEM_CLIENTE_LABEL: Record<(typeof ORIGENS_CLIENTE)[number], string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  site: "Site",
  linkedin: "LinkedIn",
  outro: "Outro",
};

// ---------- CRM ----------
export const ETAPAS_LEAD = ["novo", "em_contato", "proposta_enviada", "negociando", "ganho", "perdido"] as const;
export type EtapaLead = (typeof ETAPAS_LEAD)[number];

/** Nomes das etapas iguais ao protótipo do Figma (Pipeline). Valores no banco não mudam. */
export const ETAPA_LEAD_LABEL: Record<EtapaLead, string> = {
  novo: "Prospecção",
  em_contato: "Qualificação",
  proposta_enviada: "Proposta",
  negociando: "Negociação",
  ganho: "Fechado",
  perdido: "Perdido",
};

/** Cor de cada etapa no Pipeline (protótipo). */
export const ETAPA_LEAD_COR: Record<EtapaLead, string> = {
  novo: "#38BDF8",
  em_contato: "#C17AD2",
  proposta_enviada: "#A151B5",
  negociando: "#FBBF24",
  ganho: "#34D399",
  perdido: "#968F88",
};

export const PRIORIDADES = ["alta", "media", "baixa"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];
export const PRIORIDADE_LABEL: Record<Prioridade, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
export const PRIORIDADE_COR: Record<Prioridade, string> = { alta: "#F87171", media: "#FBBF24", baixa: "#968F88" };

export const CATEGORIAS_TAREFA = ["ligacao", "email", "reuniao", "proposta", "follow_up", "contrato", "outro"] as const;
export type CategoriaTarefa = (typeof CATEGORIAS_TAREFA)[number];
export const CATEGORIA_TAREFA_LABEL: Record<CategoriaTarefa, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  proposta: "Proposta",
  follow_up: "Follow-up",
  contrato: "Contrato",
  outro: "Outro",
};
export const CATEGORIA_TAREFA_ICONE: Record<CategoriaTarefa, string> = {
  ligacao: "📞",
  email: "✉️",
  reuniao: "📅",
  proposta: "📄",
  follow_up: "🔔",
  contrato: "📝",
  outro: "•",
};

/** Colunas do Pipeline (protótipo mostra Fechado como 5ª coluna). Perdido fica fora do kanban. */
export const ETAPAS_PIPELINE: EtapaLead[] = ["novo", "em_contato", "proposta_enviada", "negociando", "ganho"];
export const ETAPAS_LEAD_ABERTAS: EtapaLead[] = ["novo", "em_contato", "proposta_enviada", "negociando"];

export const CANAIS_INTERACAO = ["whatsapp", "email", "instagram", "ligacao", "reuniao", "outro"] as const;
export const CANAL_INTERACAO_LABEL: Record<(typeof CANAIS_INTERACAO)[number], string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  ligacao: "Ligação",
  reuniao: "Reunião",
  outro: "Outro",
};
