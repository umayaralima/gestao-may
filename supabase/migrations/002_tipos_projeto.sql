-- Tipos de projeto (serviços) editáveis pela tela Configurações.
-- Rodar no SQL Editor do Supabase (projetos que já rodaram o schema.sql original).

create table public.tipos_projeto (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.tipos_projeto enable row level security;
create policy "auth_all" on public.tipos_projeto for all to authenticated using (true) with check (true);

insert into public.tipos_projeto (nome, ordem) values
  ('Landing Page', 1),
  ('Página de Vendas', 2),
  ('E-commerce', 3),
  ('Institucional', 4),
  ('Página de Links', 5),
  ('Blog', 6);

-- projetos.tipo passa a ser texto livre (o nome do serviço), sem lista fixa
alter table public.projetos drop constraint if exists projetos_tipo_check;
