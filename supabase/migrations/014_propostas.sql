-- Proposta comercial: o elo entre o lead e o contrato. Rodar no SQL Editor depois da 013.

-- Corpo padrão da proposta (markdown com {{variaveis}}), igual ao contrato_corpo
alter table public.configuracoes
  add column proposta_corpo     text,
  add column proposta_validade  int not null default 7;   -- dias de validade padrão

create table public.propostas (
  id              uuid primary key default gen_random_uuid(),
  numero          text,                                   -- P-001/2026
  lead_id         uuid references public.leads(id) on delete set null,
  cliente_id      uuid references public.clientes(id) on delete set null,
  tipo_projeto    text,                                   -- nome em tipos_projeto
  titulo          text not null,
  documento       text,                                   -- markdown congelado na geração
  dados           jsonb not null default '{}'::jsonb,     -- condições escolhidas
  valor           numeric,
  prazo_extenso   text,
  validade        date,
  status          text not null default 'rascunho'
                  check (status in ('rascunho', 'enviada', 'aceita', 'recusada', 'expirada')),
  token           uuid not null default gen_random_uuid(),-- link público pro cliente
  enviada_em      timestamptz,
  vista_em        timestamptz,                            -- primeira abertura do link
  respondida_em   timestamptz,
  resposta_cliente text,                                  -- observação que o cliente deixou
  projeto_id      uuid references public.projetos(id) on delete set null,  -- virou projeto
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  check (lead_id is not null or cliente_id is not null)
);
create unique index propostas_token_idx on public.propostas (token);
create index propostas_lead_idx on public.propostas (lead_id);
create index propostas_cliente_idx on public.propostas (cliente_id);

alter table public.propostas enable row level security;
create policy "auth_all" on public.propostas for all to authenticated using (true) with check (true);

-- Corpo padrão (a May edita em Configurações → Contratos)
update public.configuracoes set proposta_corpo = $proposta$# PROPOSTA COMERCIAL
## {{titulo}}
Proposta nº {{numero}} · {{data_extenso}}

### PARA
**{{cliente_nome}}**
{{cliente_contato}}

### APRESENTAÇÃO
Olá, {{cliente_primeiro_nome}}! Obrigada pelo contato.

Preparei esta proposta a partir do que conversamos. Aqui você encontra o que está incluso, o prazo, o investimento e como começamos. Qualquer ponto pode ser ajustado — é só me chamar.

Sou {{contratada_nome}}, {{contratada_titulo}}. Desenvolvo sites e páginas focados em resultado: estrutura pensada para conversão, visual alinhado à sua marca e performance no celular.

### O QUE VOCÊ RECEBE
{{escopo}}

### PRAZO
{{prazo_extenso}}, contados a partir da confirmação do primeiro pagamento e do recebimento do material.

### INVESTIMENTO
**{{valor}}** ({{valor_extenso}})

{{pagamento}}

### COMO FUNCIONA
- 1. Você aceita esta proposta pelo botão no fim da página.
- 2. Envio o contrato para assinatura eletrônica e o link do primeiro pagamento.
- 3. Preenchemos o briefing e você me envia o material.
- 4. Começo a produção e acompanho você por cada etapa até a publicação.

### VALIDADE
Esta proposta vale até {{validade}}. Depois dessa data, valores e prazos podem mudar conforme a agenda.

### DÚVIDAS
Fico à disposição em {{contratada_email}}{{contratada_telefone}}.
$proposta$
where id = 1;
