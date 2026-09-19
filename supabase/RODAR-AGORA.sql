-- ============================================================
-- RODAR AGORA: migrações 002 + 003 + dados fictícios, tudo junto.
-- Colar inteiro no SQL Editor do Supabase e clicar Run.
-- ============================================================

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

-- =========================================================
-- Dados fictícios pra visualizar todas as funções.
-- Rodar DEPOIS de schema.sql + migrations 002 e 003.
-- Datas relativas a current_date: o dashboard sempre mostra
-- atrasado / hoje / esse mês / futuro.
-- =========================================================

-- Pra recomeçar do zero, descomente:
-- truncate public.interacoes, public.pagamentos, public.contratos, public.briefings,
--          public.projetos, public.clientes, public.leads restart identity cascade;

-- ---------- LEADS ----------
insert into public.leads (id, nome, empresa, whatsapp, email, instagram, origem, servico_interesse, valor_estimado, etapa, motivo_perda, proximo_followup, nota_followup, observacoes, criado_em, atualizado_em) values
  ('a0000000-0000-0000-0000-000000000001', 'Camila Duarte',       'Studio Camila Duarte',    '(11) 98811-2201', 'camila@studiocd.com.br',   'studiocamiladuarte', 'instagram', 'Landing Page',      2800.00, 'novo',             null, current_date + 2, 'Responder DM com portfólio de LPs',      'Arquiteta, quer LP pra captar projetos residenciais. Viu o carrossel de antes/depois.', now() - interval '1 day',   now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000002', 'Rafael Mendes',       'Barbearia do Rafa',       '(11) 97777-3302', null,                       'barbeariadorafa',    'indicacao', 'Página de Links',    600.00, 'novo',             null, current_date - 3, 'Ligar, ele pediu contato por telefone',   'Indicação da Juliana. Quer algo simples pra colocar na bio.', now() - interval '5 days',  now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000003', 'Dra. Fernanda Lopes', 'Clínica Lopes Odonto',    '(11) 96666-4403', 'contato@lopesodonto.com',  'lopesodonto',        'site',      'Institucional',     6500.00, 'em_contato',       null, current_date,     'Mandar proposta com 3 pacotes',           'Clínica com 3 dentistas. Quer site com agendamento online e blog.', now() - interval '8 days',  now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000004', 'Thiago Nunes',        'TN Suplementos',          '(21) 95555-5504', 'thiago@tnsuplementos.com', 'tnsuplementos',      'instagram', 'E-commerce',       12000.00, 'proposta_enviada', null, current_date + 5, 'Follow-up da proposta enviada',           'Já vende pelo WhatsApp, quer loja própria. Tem ~80 produtos.', now() - interval '15 days', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000005', 'Patrícia Alves',      'Doce Patrícia',           '(11) 94444-6605', 'pati@docepatricia.com',    'docepatricia',       'indicacao', 'Página de Vendas',  3200.00, 'proposta_enviada', null, current_date - 1, 'Ela ficou de responder ontem',            'Curso online de confeitaria. Lançamento em 6 semanas.', now() - interval '12 days', now() - interval '6 days'),
  ('a0000000-0000-0000-0000-000000000006', 'Marcos Ribeiro',      'Ribeiro Advocacia',       '(11) 93333-7706', 'marcos@ribeiroadv.com.br', null,                 'linkedin',  'Institucional',     7800.00, 'negociando',       null, current_date + 1, 'Reunião pra fechar escopo, 15h',          'Pediu desconto de 15%. Contraproposta: manter valor e parcelar em 4x.', now() - interval '20 days', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000007', 'Luana Castro',        'Luana Castro Fotografia', '(11) 92222-8807', 'oi@luanacastro.foto',      'luanacastrofoto',    'instagram', 'Institucional',     4500.00, 'ganho',            null, null, null, 'Fechou! Portfólio + página de pacotes.', now() - interval '40 days', now() - interval '30 days'),
  ('a0000000-0000-0000-0000-000000000008', 'Eduardo Farias',      'EF Consultoria',          '(11) 91111-9908', 'eduardo@efconsult.com',    null,                 'site',      'Blog',              2400.00, 'perdido',          'Fechou com agência que ofereceu pacote com tráfego pago', null, null, 'Queria blog + gestão de conteúdo mensal.', now() - interval '35 days', now() - interval '10 days');

-- ---------- CLIENTES ----------
insert into public.clientes (id, nome, empresa, nicho, email, whatsapp, origem, status, observacoes, lead_id, proximo_followup, nota_followup, criado_em) values
  ('c0000000-0000-0000-0000-000000000001', 'Luana Castro',   'Luana Castro Fotografia', 'Fotografia',  'oi@luanacastro.foto',       '(11) 92222-8807', 'instagram', 'ativo',   E'Instagram: @luanacastrofoto\nFechou! Portfólio + página de pacotes.', 'a0000000-0000-0000-0000-000000000007', null, null, now() - interval '30 days'),
  ('c0000000-0000-0000-0000-000000000002', 'Juliana Prado',  'Prado Arquitetura',       'Arquitetura', 'juliana@pradoarq.com.br',   '(11) 98888-1001', 'indicacao', 'ativo',   'Cliente desde o começo. Indica muita gente.', null, current_date + 10, 'Perguntar se quer renovar o plano de manutenção', now() - interval '180 days'),
  ('c0000000-0000-0000-0000-000000000003', 'Bruno Carvalho', 'Carvalho Fit',            'Academia',    'bruno@carvalhofit.com',     '(11) 97777-2002', 'instagram', 'ativo',   'Academia de bairro, 2 unidades.', null, null, null, now() - interval '90 days'),
  ('c0000000-0000-0000-0000-000000000004', 'Aline Souza',    'Aline Souza Nutri',       'Nutrição',    'aline@alinesouzanutri.com', '(11) 96666-3003', 'site',      'ativo',   null, null, current_date - 4, 'Cobrar aprovação do layout final', now() - interval '60 days'),
  ('c0000000-0000-0000-0000-000000000005', 'Pedro Henrique', 'PH Móveis Planejados',    'Móveis',      'pedro@phmoveis.com.br',     '(11) 95555-4004', 'indicacao', 'ativo',   null, null, null, null, now() - interval '120 days'),
  ('c0000000-0000-0000-0000-000000000006', 'Renata Lima',    'Renata Lima Cerimonial',  'Eventos',     'renata@rlcerimonial.com',   '(11) 94444-5005', 'instagram', 'inativo', 'Projeto entregue em 2025. Não respondeu proposta de manutenção.', null, null, null, now() - interval '300 days');

-- ---------- PROJETOS ----------
insert into public.projetos (id, cliente_id, nome, tipo, status, valor_total, data_inicio, prazo_entrega, link_projeto, observacoes, criado_em) values
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Portfólio + pacotes',         'Institucional',    'em_desenvolvimento', 4500.00, current_date - 25,  current_date + 20,  'https://www.figma.com/design/exemplo-luana', 'Home, sobre, portfólio por categoria (casamento, família, newborn), página de pacotes e contato.', now() - interval '28 days'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Redesign site institucional', 'Institucional',    'em_revisao',         8900.00, current_date - 60,  current_date + 5,   'https://staging.pradoarq.com.br', 'Migrar do Wix. 12 páginas. Cliente revisando textos da página de projetos.', now() - interval '65 days'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Landing page matrícula',      'Landing Page',     'entregue',           2600.00, current_date - 45,  current_date - 10,  'https://carvalhofit.com/matricula', 'LP da campanha de volta às aulas. Entregue no prazo.', now() - interval '50 days'),
  ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Página de links',             'Página de Links',  'concluido',           600.00, current_date - 100, current_date - 95,  'https://carvalhofit.com/links', null, now() - interval '100 days'),
  ('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'Site + área de receitas',     'Blog',             'aprovado',           5200.00, current_date - 5,   current_date + 40,  null, 'Blog de receitas com filtro por objetivo. Aguardando conteúdo da cliente.', now() - interval '12 days'),
  ('b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'Catálogo online',             'E-commerce',       'orcamento_enviado',  9800.00, null,               null,               null, 'Catálogo com orçamento por WhatsApp, sem checkout. ~150 produtos.', now() - interval '4 days'),
  ('b0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Página de vendas curso',      'Página de Vendas', 'briefing',           3400.00, null,               null,               null, 'Juliana quer lançar curso de SketchUp pra arquitetos. Briefing marcado.', now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000006', 'Site do cerimonial',          'Institucional',    'concluido',          3800.00, current_date - 290, current_date - 250, 'https://rlcerimonial.com', null, now() - interval '295 days'),
  ('b0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000006', 'Manutenção anual',            'Institucional',    'cancelado',          1200.00, null,               null,               null, 'Cliente não respondeu a proposta.', now() - interval '200 days');

-- ---------- PAGAMENTOS ----------
-- pago = data_pagamento preenchida; atrasado = vencimento < hoje sem pagamento; pendente = futuro
insert into public.pagamentos (projeto_id, tipo, valor, vencimento, forma_pagamento, data_pagamento) values
  -- Luana: entrada paga, parcela em 10 dias, final na entrega
  ('b0000000-0000-0000-0000-000000000001', 'entrada', 1500.00, current_date - 25, 'pix', current_date - 25),
  ('b0000000-0000-0000-0000-000000000001', 'parcela', 1500.00, current_date + 10, 'pix', null),
  ('b0000000-0000-0000-0000-000000000001', 'final',   1500.00, current_date + 20, 'pix', null),
  -- Juliana redesign: 2 pagas, 1 ATRASADA há 6 dias, final em 5 dias
  ('b0000000-0000-0000-0000-000000000002', 'entrada', 2225.00, current_date - 60, 'transferencia', current_date - 60),
  ('b0000000-0000-0000-0000-000000000002', 'parcela', 2225.00, current_date - 36, 'boleto', current_date - 34),
  ('b0000000-0000-0000-0000-000000000002', 'parcela', 2225.00, current_date - 6,  'boleto', null),
  ('b0000000-0000-0000-0000-000000000002', 'final',   2225.00, current_date + 5,  'boleto', null),
  -- Carvalho LP: entrada paga, final ATRASADA há 12 dias
  ('b0000000-0000-0000-0000-000000000003', 'entrada', 1300.00, current_date - 45, 'pix', current_date - 45),
  ('b0000000-0000-0000-0000-000000000003', 'final',   1300.00, current_date - 12, 'pix', null),
  -- Carvalho links: pago à vista
  ('b0000000-0000-0000-0000-000000000004', 'pagamento_unico', 600.00, current_date - 100, 'pix', current_date - 100),
  -- Aline: entrada paga, 2 parcelas futuras
  ('b0000000-0000-0000-0000-000000000005', 'entrada', 2080.00, current_date - 5,  'cartao', current_date - 5),
  ('b0000000-0000-0000-0000-000000000005', 'parcela', 1560.00, current_date + 3,  'cartao', null),
  ('b0000000-0000-0000-0000-000000000005', 'final',   1560.00, current_date + 40, 'cartao', null),
  -- Renata: tudo pago no passado
  ('b0000000-0000-0000-0000-000000000008', 'entrada', 1900.00, current_date - 290, 'pix', current_date - 290),
  ('b0000000-0000-0000-0000-000000000008', 'final',   1900.00, current_date - 250, 'pix', current_date - 248);

-- ---------- BRIEFINGS ----------
insert into public.briefings (projeto_id, objetivo, publico_alvo, referencias, tem_identidade_visual, cores_preferidas, conteudo_disponivel, funcionalidades, concorrentes, orcamento_aproximado) values
  ('b0000000-0000-0000-0000-000000000001', 'Mostrar o portfólio de forma elegante e converter visitante em orçamento pelo WhatsApp.', 'Casais de 25 a 40 anos e famílias com bebês, classe B, região de SP.', E'https://www.behance.net/exemplo1\nhttps://pinterest.com/exemplo-fotografia', true, 'Off-white, terracota e preto', true, 'Galeria por categoria, página de pacotes com preço a partir de, botão WhatsApp fixo, formulário de contato', 'fotografaX.com.br, estudioY.com', 4500.00),
  ('b0000000-0000-0000-0000-000000000002', 'Reposicionar o escritório como premium e gerar contatos qualificados.', 'Pessoas construindo ou reformando casa de alto padrão.', 'https://exemplo-arquitetura.com', true, 'Bege, grafite, verde musgo', false, 'Portfólio com filtro, página por projeto, blog, formulário longo de briefing', null, 9000.00),
  ('b0000000-0000-0000-0000-000000000005', 'Ter um site próprio com blog de receitas que ranqueie no Google.', 'Mulheres 30-50 buscando emagrecimento saudável.', null, false, 'Verde claro e branco', false, 'Blog com categorias, filtro por objetivo, newsletter, link pra agendamento', 'nutriexemplo.com', 5000.00);

-- ---------- CONTRATOS ----------
insert into public.contratos (projeto_id, status, link_documento, data_envio, data_assinatura, criado_em) values
  ('b0000000-0000-0000-0000-000000000001', 'assinado', 'https://app.autentique.com.br/exemplo-luana',   current_date - 27,  current_date - 26,  now() - interval '27 days'),
  ('b0000000-0000-0000-0000-000000000002', 'assinado', 'https://app.autentique.com.br/exemplo-prado',   current_date - 62,  current_date - 61,  now() - interval '63 days'),
  ('b0000000-0000-0000-0000-000000000003', 'assinado', 'https://docs.google.com/document/d/exemplo-cf', current_date - 46,  current_date - 46,  now() - interval '47 days'),
  ('b0000000-0000-0000-0000-000000000005', 'enviado',  'https://app.autentique.com.br/exemplo-aline',   current_date - 3,   null,               now() - interval '4 days'),
  ('b0000000-0000-0000-0000-000000000006', 'enviado',  'https://app.autentique.com.br/exemplo-ph',      current_date - 1,   null,               now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000007', 'rascunho', null,                                             null,               null,               now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000008', 'assinado', null,                                             current_date - 292, current_date - 291, now() - interval '293 days');

-- ---------- INTERAÇÕES ----------
insert into public.interacoes (lead_id, cliente_id, data, canal, resumo) values
  ('a0000000-0000-0000-0000-000000000003', null, current_date - 8,  'instagram', 'Mandou DM perguntando valores de site pra clínica. Respondi pedindo 5 min de call.'),
  ('a0000000-0000-0000-0000-000000000003', null, current_date - 2,  'ligacao',   'Call de 20 min. 3 dentistas, quer agendamento online e blog. Vou montar proposta com 3 pacotes.'),
  ('a0000000-0000-0000-0000-000000000004', null, current_date - 15, 'instagram', 'Primeiro contato. Vende suplementos pelo WhatsApp, quer loja.'),
  ('a0000000-0000-0000-0000-000000000004', null, current_date - 9,  'reuniao',   'Reunião no Meet. Levantei ~80 produtos, precisa de integração com Melhor Envio e Pix.'),
  ('a0000000-0000-0000-0000-000000000004', null, current_date - 2,  'email',     'Proposta enviada: R$ 12.000 em 4x, prazo 8 semanas.'),
  ('a0000000-0000-0000-0000-000000000005', null, current_date - 12, 'whatsapp',  'Indicação da Juliana. Lançamento de curso de confeitaria em 6 semanas.'),
  ('a0000000-0000-0000-0000-000000000005', null, current_date - 6,  'whatsapp',  'Proposta enviada: página de vendas + página de obrigado, R$ 3.200.'),
  ('a0000000-0000-0000-0000-000000000006', null, current_date - 20, 'outro',     'Mensagem no LinkedIn. Escritório de advocacia querendo site sério.'),
  ('a0000000-0000-0000-0000-000000000006', null, current_date - 10, 'reuniao',   'Reunião presencial. Proposta R$ 7.800.'),
  ('a0000000-0000-0000-0000-000000000006', null, current_date - 1,  'whatsapp',  'Pediu 15% de desconto. Ofereci parcelar em 4x sem desconto. Reunião amanhã pra fechar.'),
  ('a0000000-0000-0000-0000-000000000007', null, current_date - 40, 'instagram', 'DM elogiando o feed. Quer portfólio novo.'),
  ('a0000000-0000-0000-0000-000000000007', null, current_date - 32, 'whatsapp',  'Aceitou a proposta de R$ 4.500. Convertendo em cliente.'),
  ('a0000000-0000-0000-0000-000000000008', null, current_date - 35, 'email',     'Pediu orçamento de blog com produção de conteúdo.'),
  ('a0000000-0000-0000-0000-000000000008', null, current_date - 10, 'email',     'Respondeu que fechou com agência que faz conteúdo + tráfego. Perdido.'),
  (null, 'c0000000-0000-0000-0000-000000000002', current_date - 15, 'whatsapp', 'Mandou os textos revisados da home e sobre. Falta a página de projetos.'),
  (null, 'c0000000-0000-0000-0000-000000000002', current_date - 3,  'whatsapp', 'Lembrei da parcela em aberto. Disse que paga essa semana.'),
  (null, 'c0000000-0000-0000-0000-000000000004', current_date - 7,  'email',    'Enviei layout final pra aprovação.'),
  (null, 'c0000000-0000-0000-0000-000000000001', current_date - 4,  'whatsapp', 'Mandou as fotos das últimas sessões pra galeria de newborn.');

-- Tarefas (tela do Figma) + prioridade nos leads (cards do Pipeline).
-- Rodar no SQL Editor depois da 003.

alter table public.leads add column prioridade text not null default 'media'
  check (prioridade in ('alta', 'media', 'baixa'));

create table public.tarefas (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descricao    text,
  cliente_id   uuid references public.clientes(id) on delete set null,
  lead_id      uuid references public.leads(id) on delete set null,
  categoria    text not null default 'outro'
               check (categoria in ('ligacao', 'email', 'reuniao', 'proposta', 'follow_up', 'contrato', 'outro')),
  prioridade   text not null default 'media'
               check (prioridade in ('alta', 'media', 'baixa')),
  vencimento   date,
  concluida_em timestamptz,
  criado_em    timestamptz not null default now()
);
create index tarefas_vencimento_idx on public.tarefas (vencimento);
create index tarefas_cliente_id_idx on public.tarefas (cliente_id);

alter table public.tarefas enable row level security;
create policy "auth_all" on public.tarefas for all to authenticated using (true) with check (true);

-- Tarefas de exemplo (só se o seed já rodou; senão ignore os erros de FK)
insert into public.tarefas (titulo, descricao, cliente_id, lead_id, categoria, prioridade, vencimento) values
  ('Ligar pra Fernanda sobre proposta', 'Apresentar os 3 pacotes e tirar dúvidas do agendamento online.', null, 'a0000000-0000-0000-0000-000000000003', 'ligacao', 'alta', current_date),
  ('Enviar layout final pra Aline', 'Home + página de receita. Pedir aprovação até sexta.', 'c0000000-0000-0000-0000-000000000004', null, 'email', 'alta', current_date),
  ('Reunião de fechamento — Ribeiro Advocacia', 'Escopo final e forma de pagamento em 4x.', null, 'a0000000-0000-0000-0000-000000000006', 'reuniao', 'alta', current_date + 1),
  ('Follow-up Patrícia (curso de confeitaria)', null, null, 'a0000000-0000-0000-0000-000000000005', 'follow_up', 'media', current_date + 1),
  ('Cobrar parcela atrasada — Prado Arquitetura', 'Boleto venceu há 6 dias. Mandar 2ª via.', 'c0000000-0000-0000-0000-000000000002', null, 'follow_up', 'alta', current_date + 2),
  ('Montar proposta TN Suplementos', 'Loja com ~80 produtos, Melhor Envio + Pix.', null, 'a0000000-0000-0000-0000-000000000004', 'proposta', 'media', current_date + 3),
  ('Enviar contrato — PH Móveis', 'Catálogo online. Autentique.', 'c0000000-0000-0000-0000-000000000005', null, 'contrato', 'media', current_date + 4),
  ('Galeria newborn — subir fotos da Luana', null, 'c0000000-0000-0000-0000-000000000001', null, 'outro', 'baixa', current_date + 8),
  ('Renovação de manutenção — Prado', 'Perguntar se quer renovar o plano anual.', 'c0000000-0000-0000-0000-000000000002', null, 'ligacao', 'baixa', current_date + 12);

update public.tarefas set concluida_em = now() - interval '2 days' where titulo = 'Galeria newborn — subir fotos da Luana';
insert into public.tarefas (titulo, cliente_id, categoria, prioridade, vencimento, concluida_em) values
  ('Entregar LP de matrícula — Carvalho Fit', 'c0000000-0000-0000-0000-000000000003', 'outro', 'alta', current_date - 10, now() - interval '10 days'),
  ('Kick-off site + receitas — Aline', 'c0000000-0000-0000-0000-000000000004', 'reuniao', 'media', current_date - 5, now() - interval '5 days');

update public.leads set prioridade = 'alta'  where id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000006');
update public.leads set prioridade = 'baixa' where id in ('a0000000-0000-0000-0000-000000000002');
