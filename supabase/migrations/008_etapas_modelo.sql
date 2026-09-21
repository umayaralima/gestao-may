-- Etapas padrão por tipo de serviço: ao aprovar o projeto, viram tarefas de produção vinculadas a ele.
-- Rodar no SQL Editor depois da 007.

-- Ordem da etapa dentro do projeto (null = tarefa avulsa, criada à mão)
alter table public.tarefas add column ordem int;

create table public.etapas_modelo (
  id                uuid primary key default gen_random_uuid(),
  tipo_projeto      text not null,           -- nome em tipos_projeto (texto, como projetos.tipo)
  nome              text not null,
  categoria         text not null default 'Outro',  -- nome em categorias_tarefa
  dias_apos_inicio  int  not null default 0, -- prazo sugerido = data de início do projeto + N dias
  ordem             int  not null default 0
);
create index etapas_modelo_tipo_idx on public.etapas_modelo (tipo_projeto, ordem);
alter table public.etapas_modelo enable row level security;
create policy "auth_all" on public.etapas_modelo for all to authenticated using (true) with check (true);

-- Sequência padrão (a May ajusta em Configurações → Listas)
insert into public.etapas_modelo (tipo_projeto, nome, categoria, dias_apos_inicio, ordem) values
  -- Landing Page
  ('Landing Page', 'Reunião de briefing',            'Briefing',             0,  1),
  ('Landing Page', 'Receber conteúdo e materiais',   'Conteúdo',             3,  2),
  ('Landing Page', 'Wireframe',                      'Wireframe',            6,  3),
  ('Landing Page', 'Layout',                         'Layout',               10, 4),
  ('Landing Page', 'Aprovação do layout',            'Aprovação do cliente', 13, 5),
  ('Landing Page', 'Desenvolvimento',                'Desenvolvimento',      20, 6),
  ('Landing Page', 'Revisão e testes',               'Revisão',              23, 7),
  ('Landing Page', 'Publicação',                     'Publicação',           25, 8),
  -- Página de Vendas
  ('Página de Vendas', 'Reunião de briefing',        'Briefing',             0,  1),
  ('Página de Vendas', 'Copy e materiais',           'Conteúdo',             5,  2),
  ('Página de Vendas', 'Wireframe',                  'Wireframe',            8,  3),
  ('Página de Vendas', 'Layout',                     'Layout',               13, 4),
  ('Página de Vendas', 'Aprovação do layout',        'Aprovação do cliente', 16, 5),
  ('Página de Vendas', 'Desenvolvimento',            'Desenvolvimento',      24, 6),
  ('Página de Vendas', 'Integrações (checkout, pixel)', 'Desenvolvimento',   27, 7),
  ('Página de Vendas', 'Revisão e testes',           'Revisão',              29, 8),
  ('Página de Vendas', 'Publicação',                 'Publicação',           30, 9),
  -- E-commerce
  ('E-commerce', 'Reunião de briefing',              'Briefing',             0,  1),
  ('E-commerce', 'Catálogo de produtos e conteúdo',  'Conteúdo',             7,  2),
  ('E-commerce', 'Wireframe',                        'Wireframe',            10, 3),
  ('E-commerce', 'Layout',                           'Layout',               17, 4),
  ('E-commerce', 'Aprovação do layout',              'Aprovação do cliente', 20, 5),
  ('E-commerce', 'Desenvolvimento',                  'Desenvolvimento',      35, 6),
  ('E-commerce', 'Pagamento, frete e cadastro de produtos', 'Desenvolvimento', 42, 7),
  ('E-commerce', 'Revisão e testes de compra',       'Revisão',              45, 8),
  ('E-commerce', 'Publicação',                       'Publicação',           48, 9),
  -- Institucional
  ('Institucional', 'Reunião de briefing',           'Briefing',             0,  1),
  ('Institucional', 'Receber conteúdo e materiais',  'Conteúdo',             5,  2),
  ('Institucional', 'Wireframe',                     'Wireframe',            8,  3),
  ('Institucional', 'Layout',                        'Layout',               14, 4),
  ('Institucional', 'Aprovação do layout',           'Aprovação do cliente', 17, 5),
  ('Institucional', 'Desenvolvimento',               'Desenvolvimento',      27, 6),
  ('Institucional', 'Revisão e testes',              'Revisão',              30, 7),
  ('Institucional', 'Publicação',                    'Publicação',           32, 8),
  -- Página de Links
  ('Página de Links', 'Briefing rápido',             'Briefing',             0,  1),
  ('Página de Links', 'Layout',                      'Layout',               2,  2),
  ('Página de Links', 'Aprovação',                   'Aprovação do cliente', 3,  3),
  ('Página de Links', 'Desenvolvimento e publicação','Publicação',           5,  4),
  -- Blog
  ('Blog', 'Reunião de briefing',                    'Briefing',             0,  1),
  ('Blog', 'Estrutura e categorias',                 'Conteúdo',             4,  2),
  ('Blog', 'Layout',                                 'Layout',               9,  3),
  ('Blog', 'Aprovação do layout',                    'Aprovação do cliente', 12, 4),
  ('Blog', 'Desenvolvimento',                        'Desenvolvimento',      19, 5),
  ('Blog', 'Revisão e testes',                       'Revisão',              21, 6),
  ('Blog', 'Publicação',                             'Publicação',           23, 7);
