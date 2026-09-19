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

export const ETAPA_LEAD_LABEL: Record<EtapaLead, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  proposta_enviada: "Proposta enviada",
  negociando: "Negociando",
  ganho: "Ganho",
  perdido: "Perdido",
};

/** Etapas que aparecem no funil (kanban). Ganho/perdido ficam na lista de fechados. */
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
