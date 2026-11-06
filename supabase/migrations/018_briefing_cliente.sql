-- Briefing respondido pelo CLIENTE, por link público. Substitui o briefing antigo
-- (9 campos fixos preenchidos pela May) como fonte do que o cliente informou.
-- Os campos antigos continuam na tabela, intocados, pra não perder nada já gravado.
-- Rodar depois da 017.

-- ---------------------------------------------------------------------------
-- Perguntas: ficam no banco pra May reescrever sem depender de deploy.
-- `chave` é o identificador estável das respostas — reordenar, renomear ou
-- reescrever uma pergunta não perde o que o cliente já respondeu.
-- ---------------------------------------------------------------------------
create table if not exists public.briefing_perguntas (
  id          uuid primary key default gen_random_uuid(),
  chave       text not null unique,
  secao       text not null,
  -- null = vale pra todo projeto. 'A' landing/vendas, 'B' e-commerce,
  -- 'C' identidade visual (aparece quando o cliente diz que não tem identidade).
  bloco       text check (bloco in ('A', 'B', 'C')),
  texto       text not null,
  ajuda       text,
  tipo        text not null default 'texto_longo'
              check (tipo in ('texto_curto', 'texto_longo', 'sim_nao', 'link')),
  obrigatoria boolean not null default false,
  ordem       int     not null default 0,
  ativa       boolean not null default true
);
create index if not exists briefing_perguntas_ordem_idx on public.briefing_perguntas (ordem);

alter table public.briefing_perguntas enable row level security;
drop policy if exists "auth_all" on public.briefing_perguntas;
create policy "auth_all" on public.briefing_perguntas for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Respostas: entram na tabela que já existe, uma por projeto.
-- `respostas` é { "<chave>": { "t": "texto", "ns": true } } — `ns` = não sei
-- responder, que é diferente de deixar em branco: em branco é "não chegou lá",
-- "não sei" é "isso a gente constrói junto".
-- ---------------------------------------------------------------------------
alter table public.briefings
  add column if not exists token         uuid not null default gen_random_uuid(),
  add column if not exists status        text not null default 'rascunho'
                                         check (status in ('rascunho', 'enviado', 'respondido')),
  add column if not exists respostas     jsonb not null default '{}'::jsonb,
  add column if not exists enviado_em    timestamptz,
  add column if not exists vista_em      timestamptz,
  add column if not exists respondido_em timestamptz,
  add column if not exists atualizado_em timestamptz not null default now();

create unique index if not exists briefings_token_idx on public.briefings (token);

-- Texto de abertura que o cliente lê antes das perguntas (editável em Configurações)
alter table public.configuracoes
  add column if not exists briefing_intro text;

update public.configuracoes set briefing_intro = $intro$Este briefing é a base de tudo: é dele que saem os textos, a estrutura e o design do seu site. Quanto mais detalhe, mais o site vai soar como você. Não existe resposta errada. Se tiver dúvida em alguma pergunta, escreve do seu jeito.

Se não souber responder alguma coisa, use o botão "não sei responder" em vez de deixar em branco — assim eu sei onde preciso te ajudar.

O prazo do projeto começa a contar quando o briefing chega completo, junto com os materiais.$intro$
where id = 1 and coalesce(briefing_intro, '') = '';


-- ---------------------------------------------------------------------------
-- As 49 perguntas. Só três são obrigatórias: sem elas o site não sai do lugar.
-- ---------------------------------------------------------------------------
insert into public.briefing_perguntas (chave, secao, bloco, texto, ajuda, tipo, obrigatoria, ordem) values

-- 1. SOBRE VOCÊ E O SEU NEGÓCIO
('nome_negocio',        'Sobre você e o seu negócio', null, 'Qual é o nome do negócio, do jeito que deve aparecer no site?', null, 'texto_curto', true, 1),
('o_que_faz',           'Sobre você e o seu negócio', null, 'Como você explicaria o que faz pra um amigo, em uma ou duas frases?', null, 'texto_longo', false, 2),
('tempo_atuacao',       'Sobre você e o seu negócio', null, 'Há quanto tempo você atua? Tem formação, certificação ou registro profissional que queira mostrar?', null, 'texto_longo', false, 3),
('regioes',             'Sobre você e o seu negócio', null, 'Quais cidades ou regiões você atende? Atende online?', null, 'texto_longo', false, 4),
('servicos',            'Sobre você e o seu negócio', null, 'Liste seus serviços ou produtos. Qual deles você mais quer vender?', null, 'texto_longo', false, 5),

-- 2. SEU CLIENTE
('cliente_ideal',       'Seu cliente', null, 'Quem é o seu cliente ideal?', 'Fala de idade, profissão, momento de vida, o que for relevante. Se nunca parou pra pensar nisso, marca "não sei" que a gente define junto.', 'texto_longo', false, 6),
('problema_desejo',     'Seu cliente', null, 'Qual problema ou desejo faz essa pessoa te procurar?', null, 'texto_longo', false, 7),
('perguntas_frequentes','Seu cliente', null, 'Quais perguntas ela costuma fazer antes de fechar?', null, 'texto_longo', false, 8),
('objecoes',            'Seu cliente', null, 'O que faz alguém desistir de fechar com você?', 'Preço, tempo, insegurança…', 'texto_longo', false, 9),
('como_encontram',      'Seu cliente', null, 'Como os clientes te encontram hoje?', 'Instagram, indicação, Google…', 'texto_longo', false, 10),

-- 3. DIFERENCIAL E PROVA
('diferencial',         'Diferencial e prova', null, 'Por que os seus clientes escolhem você e não outra pessoa?', null, 'texto_longo', false, 11),
('resultados',          'Diferencial e prova', null, 'Tem resultados que pode mostrar? Números, casos, conquistas.', 'Se a sua profissão tem conselho de classe, confere o que ele permite divulgar.', 'texto_longo', false, 12),
('depoimentos',         'Diferencial e prova', null, 'Tem depoimentos de clientes?', 'Envie prints ou textos na pasta de materiais, e confirme aqui que pode publicar.', 'texto_longo', false, 13),
('midia_parcerias',     'Diferencial e prova', null, 'Já atendeu empresas, fez parcerias ou apareceu em alguma mídia que valha citar?', null, 'texto_longo', false, 14),

-- 4. OBJETIVO DO SITE
('acao_principal',      'Objetivo do site', null, 'Qual é a principal ação que você quer que o visitante faça?', 'Chamar no WhatsApp, agendar, preencher formulário, comprar.', 'texto_longo', false, 15),
('sucesso_3_meses',     'Objetivo do site', null, 'Daqui a 3 meses, como você vai saber que o site está funcionando?', null, 'texto_longo', false, 16),
('paginas',             'Objetivo do site', null, 'Quais páginas ou seções você imagina no site?', 'Se não souber, tudo bem: eu proponho.', 'texto_longo', false, 17),

-- 5. TOM E REFERÊNCIAS
('tres_palavras',       'Tom e referências', null, 'Escolha 3 palavras para como você quer que as pessoas te percebam.', null, 'texto_curto', false, 18),
('site_que_gosta',      'Tom e referências', null, 'Tem algum site que você goste? Mande o link e diga o que te chama atenção nele.', null, 'texto_longo', false, 19),
('site_que_nao_gosta',  'Tom e referências', null, 'Tem algum site que você não gosta? Por quê?', null, 'texto_longo', false, 20),
('concorrentes',        'Tom e referências', null, 'Quem são seus principais concorrentes?', null, 'texto_longo', false, 21),
('proibicoes',          'Tom e referências', null, 'Existe alguma palavra, assunto ou promessa que não pode aparecer no site?', null, 'texto_longo', false, 22),

-- 6. IDENTIDADE VISUAL E MATERIAIS
('tem_identidade',      'Identidade visual e materiais', null, 'Você já tem logo e identidade visual?', 'Se sim, envie os arquivos na pasta de materiais: logo em PNG ou vetor, cores e fontes. Se não, aparecem algumas perguntas extras no fim.', 'sim_nao', false, 23),
('pasta_materiais',     'Identidade visual e materiais', null, 'Envie o link de uma pasta (Drive, por exemplo) com as fotos e vídeos que vão no site.', 'Deixe a pasta com permissão de visualização para qualquer pessoa com o link.', 'link', false, 24),
('fotos_equipe',        'Identidade visual e materiais', null, 'Tem fotos suas ou da equipe?', 'Elas passam muita confiança no site.', 'texto_longo', false, 25),

-- 7. PARTE TÉCNICA E ACESSOS
('dominio',             'Parte técnica e acessos', null, 'Você já tem domínio? Qual é, e em qual site foi registrado?', null, 'texto_longo', false, 26),
('hospedagem',          'Parte técnica e acessos', null, 'Já tem hospedagem ou prefere a VPS comigo?', null, 'texto_longo', false, 27),
('whatsapp_site',       'Parte técnica e acessos', null, 'Qual número de WhatsApp vai no botão do site?', null, 'texto_curto', true, 28),
('email_formulario',    'Parte técnica e acessos', null, 'Pra qual e-mail devem chegar os contatos do formulário?', null, 'texto_curto', true, 29),
('redes_sociais',       'Parte técnica e acessos', null, 'Mande os links das suas redes sociais.', null, 'texto_longo', false, 30),
('ferramentas',         'Parte técnica e acessos', null, 'Usa alguma ferramenta que precisa aparecer no site?', 'Agenda online, Google Meu Negócio, Analytics, Pixel.', 'texto_longo', false, 31),
('quem_aprova',         'Parte técnica e acessos', null, 'Quem vai aprovar as etapas do projeto?', 'Se for mais de uma pessoa, diga quem tem a palavra final.', 'texto_longo', false, 32),

-- BLOCO A: LANDING PAGE OU PÁGINA DE VENDAS
('oferta',              'Landing page ou página de vendas', 'A', 'Qual é a oferta?', 'Produto, serviço ou evento.', 'texto_longo', false, 33),
('preco_pagamento',     'Landing page ou página de vendas', 'A', 'Qual é o preço e quais formas de pagamento você aceita?', null, 'texto_longo', false, 34),
('garantia_bonus',      'Landing page ou página de vendas', 'A', 'Tem garantia, bônus ou condição especial?', null, 'texto_longo', false, 35),
('prazo_vagas',         'Landing page ou página de vendas', 'A', 'A oferta tem prazo ou número limitado de vagas?', 'Só coloque o que for real.', 'texto_longo', false, 36),
('publico_especifico',  'Landing page ou página de vendas', 'A', 'Quem é o público específico dessa página? Ele é diferente do seu público geral?', null, 'texto_longo', false, 37),

-- BLOCO B: E-COMMERCE
('qtd_produtos',        'E-commerce', 'B', 'Quantos produtos você tem e em quais categorias?', null, 'texto_longo', false, 38),
('variacoes',           'E-commerce', 'B', 'Os produtos têm variações?', 'Tamanho, cor, sabor.', 'texto_longo', false, 39),
('fotos_produtos',      'E-commerce', 'B', 'Você já tem fotos dos produtos com fundo padronizado?', null, 'texto_longo', false, 40),
('meios_pagamento',     'E-commerce', 'B', 'Quais meios de pagamento você quer oferecer?', null, 'texto_longo', false, 41),
('envio',               'E-commerce', 'B', 'Como faz o envio?', 'Correios, Melhor Envio, motoboy, retirada no local.', 'texto_longo', false, 42),
('troca_devolucao',     'E-commerce', 'B', 'Qual é a sua política de troca e devolução?', null, 'texto_longo', false, 43),
('nota_fiscal',         'E-commerce', 'B', 'Você emite nota fiscal?', null, 'sim_nao', false, 44),

-- BLOCO C: IDENTIDADE VISUAL BÁSICA
('significado_nome',    'Identidade visual básica', 'C', 'O nome do negócio tem algum significado ou história?', null, 'texto_longo', false, 45),
('sensacao_marca',      'Identidade visual básica', 'C', 'Que sensação a marca deve passar?', 'Por exemplo: acolhimento, energia, sofisticação.', 'texto_longo', false, 46),
('cores',               'Identidade visual básica', 'C', 'Tem cores que você ama? E cores que não quer de jeito nenhum?', null, 'texto_longo', false, 47),
('marcas_admira',       'Identidade visual básica', 'C', 'Mande 2 ou 3 marcas cujo visual você admira.', null, 'texto_longo', false, 48),
('onde_usada',          'Identidade visual básica', 'C', 'Onde a marca vai ser mais usada?', 'Instagram, cartão, fachada, uniforme.', 'texto_longo', false, 49)

on conflict (chave) do nothing;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA · 49 perguntas e as colunas novas em briefings
-- ---------------------------------------------------------------------------
select (select count(*) from public.briefing_perguntas) as perguntas,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'briefings'
                           and column_name = 'respostas')
            then 'ok' else 'FALTOU' end as coluna_respostas,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'configuracoes'
                           and column_name = 'briefing_intro')
            then 'ok' else 'FALTOU' end as coluna_intro;
