-- CRM: leads, funil, follow-up e histórico de interações.
-- Rodar no SQL Editor do Supabase depois da 002.

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  empresa           text,
  whatsapp          text,
  email             text,
  instagram         text,
  origem            text,
  servico_interesse text,            -- nome de um serviço em tipos_projeto
  valor_estimado    numeric(12,2),
  etapa             text not null default 'novo'
                    check (etapa in ('novo', 'em_contato', 'proposta_enviada', 'negociando', 'ganho', 'perdido')),
  motivo_perda      text,
  proximo_followup  date,
  nota_followup     text,
  observacoes       text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index leads_etapa_idx    on public.leads (etapa);
create index leads_followup_idx on public.leads (proximo_followup);

-- Cliente lembra de qual lead veio (conversão)
alter table public.clientes add column lead_id uuid references public.leads(id) on delete set null;
-- Cliente também pode ter follow-up (pós-venda, upsell)
alter table public.clientes add column proximo_followup date;
alter table public.clientes add column nota_followup text;

-- Interações: registro manual, de um lead OU de um cliente
create table public.interacoes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references public.leads(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  data       date not null default current_date,
  canal      text,                   -- whatsapp, email, instagram, ligacao, reuniao, outro
  resumo     text not null,
  criado_em  timestamptz not null default now(),
  check (lead_id is not null or cliente_id is not null)
);
create index interacoes_lead_id_idx    on public.interacoes (lead_id);
create index interacoes_cliente_id_idx on public.interacoes (cliente_id);

alter table public.leads      enable row level security;
alter table public.interacoes enable row level security;
create policy "auth_all" on public.leads      for all to authenticated using (true) with check (true);
create policy "auth_all" on public.interacoes for all to authenticated using (true) with check (true);
