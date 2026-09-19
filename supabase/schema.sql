-- =========================================================
-- Sistema de Gestão May Lima — schema v1
-- Rodar no SQL Editor do Supabase
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- CLIENTES ----------
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  empresa     text,
  nicho       text,
  email       text,
  whatsapp    text,
  origem      text,
  status      text not null default 'ativo'
              check (status in ('ativo', 'inativo')),
  observacoes text,
  criado_em   timestamptz not null default now()
);

-- ---------- TIPOS DE PROJETO (serviços, editáveis em Configurações) ----------
create table public.tipos_projeto (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);
insert into public.tipos_projeto (nome, ordem) values
  ('Landing Page', 1), ('Página de Vendas', 2), ('E-commerce', 3),
  ('Institucional', 4), ('Página de Links', 5), ('Blog', 6);

-- ---------- PROJETOS ----------
create table public.projetos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  nome          text not null,
  tipo          text, -- nome de um serviço em tipos_projeto (texto livre)
  status        text not null default 'briefing'
                check (status in
                  ('briefing', 'orcamento_enviado', 'aprovado', 'em_desenvolvimento',
                   'em_revisao', 'entregue', 'concluido', 'cancelado')),
  valor_total   numeric(12,2),
  data_inicio   date,
  prazo_entrega date,
  link_projeto  text,
  observacoes   text,
  criado_em     timestamptz not null default now()
);
create index projetos_cliente_id_idx on public.projetos (cliente_id);
create index projetos_status_idx     on public.projetos (status);

-- ---------- BRIEFINGS (Fase 2) ----------
create table public.briefings (
  id                    uuid primary key default gen_random_uuid(),
  projeto_id            uuid not null unique references public.projetos(id) on delete cascade,
  objetivo              text,
  publico_alvo          text,
  referencias           text,
  tem_identidade_visual boolean not null default false,
  cores_preferidas      text,
  conteudo_disponivel   boolean not null default false,
  funcionalidades       text,
  concorrentes          text,
  orcamento_aproximado  numeric(12,2),
  respostas_extra       jsonb,
  criado_em             timestamptz not null default now()
);

-- ---------- CONTRATOS (Fase 2) ----------
create table public.contratos (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.projetos(id) on delete cascade,
  status          text not null default 'rascunho'
                  check (status in ('rascunho', 'enviado', 'assinado')),
  link_documento  text,
  data_envio      date,
  data_assinatura date,
  criado_em       timestamptz not null default now()
);
create index contratos_projeto_id_idx on public.contratos (projeto_id);

-- ---------- PAGAMENTOS ----------
create table public.pagamentos (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.projetos(id) on delete cascade,
  tipo            text
                  check (tipo is null or tipo in ('entrada', 'parcela', 'pagamento_unico', 'final')),
  valor           numeric(12,2) not null check (valor > 0),
  vencimento      date not null,
  forma_pagamento text,
  data_pagamento  date,
  criado_em       timestamptz not null default now()
);
create index pagamentos_projeto_id_idx on public.pagamentos (projeto_id);
create index pagamentos_vencimento_idx on public.pagamentos (vencimento);

-- Status calculado em tempo real (nunca fica desatualizado, sem cron)
create or replace view public.pagamentos_view as
select
  p.*,
  case
    when p.data_pagamento is not null then 'pago'
    when p.vencimento < current_date    then 'atrasado'
    else 'pendente'
  end as status
from public.pagamentos p;

-- ---------- RLS: só usuário autenticado (sistema de uso único) ----------
alter table public.clientes   enable row level security;
alter table public.tipos_projeto enable row level security;
alter table public.projetos   enable row level security;
alter table public.briefings  enable row level security;
alter table public.contratos  enable row level security;
alter table public.pagamentos enable row level security;

create policy "auth_all" on public.clientes   for all to authenticated using (true) with check (true);
create policy "auth_all" on public.tipos_projeto for all to authenticated using (true) with check (true);
create policy "auth_all" on public.projetos   for all to authenticated using (true) with check (true);
create policy "auth_all" on public.briefings  for all to authenticated using (true) with check (true);
create policy "auth_all" on public.contratos  for all to authenticated using (true) with check (true);
create policy "auth_all" on public.pagamentos for all to authenticated using (true) with check (true);

-- A view herda o RLS da tabela base com security_invoker
alter view public.pagamentos_view set (security_invoker = true);
