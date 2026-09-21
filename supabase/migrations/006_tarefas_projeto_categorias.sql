-- Tarefas de produção (pós-fechamento): tarefa pode apontar pra um projeto e as categorias
-- deixam de ser fixas no código (tabela editável em Configurações, com grupo Comercial / Produção).
-- Rodar no SQL Editor depois da 005.

-- 1) Vínculo com projeto
alter table public.tarefas add column projeto_id uuid references public.projetos(id) on delete set null;
create index tarefas_projeto_id_idx on public.tarefas (projeto_id);

-- 2) Categorias editáveis (mesmo padrão de tipos_projeto: a tarefa guarda o nome em texto)
create table public.categorias_tarefa (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique,
  grupo  text not null default 'producao' check (grupo in ('comercial', 'producao', 'outro')),
  icone  text not null default '•',
  ordem  int  not null default 0
);
alter table public.categorias_tarefa enable row level security;
create policy "auth_all" on public.categorias_tarefa for all to authenticated using (true) with check (true);

insert into public.categorias_tarefa (nome, grupo, icone, ordem) values
  ('Ligação',              'comercial', '📞', 1),
  ('E-mail',               'comercial', '✉️', 2),
  ('Reunião',              'comercial', '📅', 3),
  ('Proposta',             'comercial', '📄', 4),
  ('Follow-up',            'comercial', '🔔', 5),
  ('Contrato',             'comercial', '📝', 6),
  ('Briefing',             'producao',  '🗒️', 10),
  ('Conteúdo',             'producao',  '✍️', 11),
  ('Wireframe',            'producao',  '📐', 12),
  ('Layout',               'producao',  '🎨', 13),
  ('Aprovação do cliente', 'producao',  '👀', 14),
  ('Desenvolvimento',      'producao',  '💻', 15),
  ('Revisão',              'producao',  '🔍', 16),
  ('Publicação',           'producao',  '🚀', 17),
  ('Ajuste pós-entrega',   'producao',  '🔧', 18),
  ('Outro',                'outro',     '•',  99);

-- 3) tarefas.categoria passa a guardar o nome; converte os valores antigos
alter table public.tarefas drop constraint if exists tarefas_categoria_check;
update public.tarefas set categoria = case categoria
  when 'ligacao'   then 'Ligação'
  when 'email'     then 'E-mail'
  when 'reuniao'   then 'Reunião'
  when 'proposta'  then 'Proposta'
  when 'follow_up' then 'Follow-up'
  when 'contrato'  then 'Contrato'
  else 'Outro' end;
alter table public.tarefas alter column categoria set default 'Outro';
