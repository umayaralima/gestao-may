-- 1) Permuta como forma de pagamento  2) Entrada de leads pelo site / ManyChat.
-- Rodar no SQL Editor depois da 012.

-- Permuta na forma preferida (o check da 005 só aceitava pix/boleto/cartao/transferencia/outro)
alter table public.configuracoes drop constraint if exists configuracoes_forma_pagamento_preferida_check;
alter table public.configuracoes add constraint configuracoes_forma_pagamento_preferida_check
  check (forma_pagamento_preferida in ('pix', 'boleto', 'cartao', 'transferencia', 'permuta', 'outro'));

-- Token da API pública de leads (aparece em Configurações → Integrações; trocável)
alter table public.configuracoes add column leads_token uuid not null default gen_random_uuid();

-- De onde o lead entrou (formulário do site, ManyChat, etc.) e o que ele escreveu
alter table public.leads
  add column entrada  text,   -- 'formulario', 'manychat', 'manual'
  add column mensagem text;   -- texto que a pessoa mandou

-- Registro das chamadas da API pública, pra depurar integração sem abrir log da Vercel
create table public.entradas_lead (
  id         uuid primary key default gen_random_uuid(),
  origem     text not null,
  payload    jsonb not null,
  lead_id    uuid references public.leads(id) on delete set null,
  erro       text,
  criado_em  timestamptz not null default now()
);
alter table public.entradas_lead enable row level security;
create policy "auth_all" on public.entradas_lead for all to authenticated using (true) with check (true);
