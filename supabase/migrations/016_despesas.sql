-- Despesas: o que sai, pra enxergar lucro e não só faturamento. Rodar depois da 015.

create table public.categorias_despesa (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  icone text not null default '•',
  ordem int  not null default 0
);
alter table public.categorias_despesa enable row level security;
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
  ('Outros',                '•',  99);

create table public.despesas (
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
create index despesas_data_idx on public.despesas (data);
create index despesas_projeto_idx on public.despesas (projeto_id);
create index despesas_recorrente_idx on public.despesas (recorrente) where recorrente;

alter table public.despesas enable row level security;
create policy "auth_all" on public.despesas for all to authenticated using (true) with check (true);
