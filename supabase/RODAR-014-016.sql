-- =====================================================================
-- RODAR-014-016.sql  ·  Propostas (014) + Respostas do formulário (015)
--                       + Despesas (016)
-- Cole tudo de uma vez no SQL Editor do Supabase e clique em Run.
--
-- O Supabase vai mostrar o aviso "Potential issue detected / destructive
-- operations". É falso positivo: ele reage à palavra `drop` nas três
-- linhas `drop policy if exists`, que existem só pra permitir rodar este
-- script mais de uma vez. Cada uma é seguida do `create policy` idêntico.
-- Não há drop table, drop column, delete nem truncate aqui.
--
-- Tudo é idempotente. O corpo padrão da proposta só é escrito se ainda
-- estiver vazio, então não sobrescreve o que você editar em
-- Configurações → Contratos.
-- =====================================================================


-- =====================================================================
-- 014 · PROPOSTAS
-- =====================================================================

-- Corpo padrão da proposta (markdown com {{variaveis}}), igual ao contrato_corpo
alter table public.configuracoes
  add column if not exists proposta_corpo     text,
  add column if not exists proposta_validade  int not null default 7;   -- dias de validade padrão

create table if not exists public.propostas (
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
create unique index if not exists propostas_token_idx   on public.propostas (token);
create index        if not exists propostas_lead_idx    on public.propostas (lead_id);
create index        if not exists propostas_cliente_idx on public.propostas (cliente_id);

alter table public.propostas enable row level security;
drop policy if exists "auth_all" on public.propostas;
create policy "auth_all" on public.propostas for all to authenticated using (true) with check (true);

-- Corpo padrão (a May edita em Configurações → Contratos).
-- O "where" garante que uma edição sua nunca seja sobrescrita.
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
where id = 1 and coalesce(proposta_corpo, '') = '';


-- =====================================================================
-- 015 · RESPOSTAS DO FORMULÁRIO
-- Rede de segurança: se a coluna já existe, esta linha não faz nada.
-- =====================================================================

alter table public.leads add column if not exists respostas jsonb not null default '{}'::jsonb;


-- =====================================================================
-- 016 · DESPESAS
-- =====================================================================

create table if not exists public.categorias_despesa (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  icone text not null default '•',
  ordem int  not null default 0
);
alter table public.categorias_despesa enable row level security;
drop policy if exists "auth_all" on public.categorias_despesa;
create policy "auth_all" on public.categorias_despesa for all to authenticated using (true) with check (true);

insert into public.categorias_despesa (nome, icone, ordem) values
  ('Hospedagem',            '🖥️', 1),
  ('Domínio',               '🌐', 2),
  ('Licenças e plugins',    '🧩', 3),
  ('Ferramentas e assinaturas', '🔧', 4),
  ('Anúncios e marketing',  '📣', 5),
  ('Cursos e livros',       '📚', 6),
  ('Equipamento',           '💻', 7),
  ('Impostos e taxas',      '🧾', 8),
  ('Contador',              '📊', 9),
  ('Terceirizados',         '🤝', 10),
  ('Outros',                '•',  99)
on conflict (nome) do nothing;

create table if not exists public.despesas (
  id             uuid primary key default gen_random_uuid(),
  descricao      text not null,
  categoria      text not null default 'Outros',   -- nome em categorias_despesa
  valor          numeric not null check (valor > 0),
  data           date not null,                    -- competência / vencimento
  pago_em        date,                             -- null = a pagar
  forma_pagamento text,
  fornecedor     text,
  -- custo direto de um projeto (entra no cálculo de margem daquele projeto)
  projeto_id     uuid references public.projetos(id) on delete set null,
  -- recorrência: o cron cria a próxima ocorrência quando a data chega
  recorrente     boolean not null default false,
  periodicidade  text check (periodicidade in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  recorrencia_ate date,                            -- null = sem fim
  origem_id      uuid references public.despesas(id) on delete set null, -- quem gerou esta ocorrência
  observacoes    text,
  criado_em      timestamptz not null default now()
);
create index if not exists despesas_data_idx       on public.despesas (data);
create index if not exists despesas_projeto_idx    on public.despesas (projeto_id);
create index if not exists despesas_recorrente_idx on public.despesas (recorrente) where recorrente;

alter table public.despesas enable row level security;
drop policy if exists "auth_all" on public.despesas;
create policy "auth_all" on public.despesas for all to authenticated using (true) with check (true);


-- =====================================================================
-- CONFERÊNCIA · o resultado deve trazer 5 linhas, todas com "ok"
-- =====================================================================

select 'propostas' as item,
       case when exists (select 1 from information_schema.tables
                         where table_schema = 'public' and table_name = 'propostas')
            then 'ok' else 'FALTOU' end as situacao
union all
select 'configuracoes.proposta_corpo',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'configuracoes'
                           and column_name = 'proposta_corpo')
            then 'ok' else 'FALTOU' end
union all
select 'leads.respostas',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'leads'
                           and column_name = 'respostas')
            then 'ok' else 'FALTOU' end
union all
select 'categorias_despesa',
       case when exists (select 1 from information_schema.tables
                         where table_schema = 'public' and table_name = 'categorias_despesa')
            then 'ok' else 'FALTOU' end
union all
select 'despesas',
       case when exists (select 1 from information_schema.tables
                         where table_schema = 'public' and table_name = 'despesas')
            then 'ok' else 'FALTOU' end;
