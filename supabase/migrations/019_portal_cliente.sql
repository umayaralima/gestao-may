-- Portal do cliente: um link por projeto onde o cliente acompanha as etapas,
-- aprova layout e manda recado/material. Rodar depois da 018.
--
-- Sem login, como a proposta (/p/) e o briefing (/b/): o token É a credencial.
-- Token nulo = portal nunca liberado ou revogado; trocar o token derruba o link
-- antigo sem apagar o histórico de aprovações.

alter table public.projetos
  add column if not exists portal_token    uuid,
  add column if not exists portal_liberado_em timestamptz,
  add column if not exists portal_vista_em timestamptz;

-- Único entre projetos, mas permite vários nulos (projeto sem portal).
create unique index if not exists projetos_portal_token_idx
  on public.projetos (portal_token) where portal_token is not null;

-- Pedido de aprovação. É o registro que faltava: quem aprovou o quê e quando.
-- "ajuste" não é recusa, é o cliente pedindo mudança — ela resolve e pede de novo.
create table if not exists public.aprovacoes (
  id                 uuid primary key default gen_random_uuid(),
  projeto_id         uuid not null references public.projetos(id) on delete cascade,
  titulo             text not null,
  descricao          text,
  link               text,                      -- layout, staging, Figma: onde o cliente olha
  status             text not null default 'aguardando'
                     check (status in ('aguardando', 'aprovado', 'ajuste')),
  comentario_cliente text,
  -- nome que o cliente digitou ao decidir. Não é autenticação, é registro:
  -- serve pra ela saber com quem falou quando alguém disser "eu não aprovei isso".
  decidido_por       text,
  decidido_em        timestamptz,
  criado_em          timestamptz not null default now()
);
create index if not exists aprovacoes_projeto_idx on public.aprovacoes (projeto_id);

alter table public.aprovacoes enable row level security;
drop policy if exists "auth_all" on public.aprovacoes;
create policy "auth_all" on public.aprovacoes for all to authenticated using (true) with check (true);

-- Recado e material que o cliente manda pelo portal entram em `interacoes` com
-- canal 'portal' (a coluna é texto livre, sem check), então aparecem na timeline
-- do cliente junto com WhatsApp e e-mail, sem tabela nova.

-- Conferência
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'projetos'
      and column_name in ('portal_token', 'portal_liberado_em', 'portal_vista_em')) as colunas_projetos_esperado_3,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'aprovacoes') as tabela_aprovacoes_esperado_1;
