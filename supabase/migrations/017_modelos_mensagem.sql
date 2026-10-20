-- Modelos de mensagem: os textos que a May repete todo dia (follow-up, cobrança,
-- pedido de material, aviso de entrega) com {{variaveis}} resolvidas pelo contexto.
-- Mesmo motor do contrato e da proposta. Rodar depois da 016.

create table if not exists public.modelos_mensagem (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  -- onde o modelo aparece: define quais variáveis existem e em que tela ele é oferecido
  situacao  text not null default 'outro'
            check (situacao in ('lead', 'proposta', 'cobranca', 'projeto', 'cliente', 'outro')),
  canal     text not null default 'whatsapp'
            check (canal in ('whatsapp', 'email', 'ambos')),
  assunto   text,                                   -- só usado quando o canal inclui e-mail
  corpo     text not null,                          -- markdown leve + {{variaveis}}
  ordem     int     not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists modelos_mensagem_situacao_idx on public.modelos_mensagem (situacao, ordem);

alter table public.modelos_mensagem enable row level security;
drop policy if exists "auth_all" on public.modelos_mensagem;
create policy "auth_all" on public.modelos_mensagem for all to authenticated using (true) with check (true);


-- =====================================================================
-- Biblioteca inicial. A May edita tudo em Configurações → Mensagens;
-- o "on conflict do nothing" (via índice único no nome) evita duplicar
-- se este script rodar duas vezes.
-- =====================================================================

create unique index if not exists modelos_mensagem_nome_idx on public.modelos_mensagem (nome);

insert into public.modelos_mensagem (nome, situacao, canal, assunto, corpo, ordem) values

-- ----- LEAD -----
('Primeiro contato (lead do site)', 'lead', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}! Aqui é a {{contratada_nome}}, {{contratada_titulo}}.

Recebi seu contato pelo site sobre {{servico}} e já separei um horário pra entender melhor o que você precisa.

Pode me contar um pouco do seu negócio e do que você tem em mente? Se preferir, me diz um horário bom e eu te ligo.$msg$, 1),

('Follow-up — sem resposta', 'lead', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}, tudo bem?

Passando só pra saber se você chegou a ver minha mensagem sobre {{servico}}. Sei que a correria aperta, então sem pressa nenhuma.

Se ainda fizer sentido, é só me chamar que a gente retoma de onde parou.$msg$, 2),

('Follow-up — proposta enviada', 'proposta', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}!

Queria saber se você conseguiu dar uma olhada na proposta que te mandei ({{valor}}).

Qualquer ponto que não tenha ficado claro, ou que você queira ajustar, me fala sem cerimônia — dá pra adaptar escopo e condição de pagamento.

Segue o link de novo, pra facilitar: {{link_proposta}}$msg$, 3),

('Enviar proposta', 'proposta', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}! Como combinamos, preparei sua proposta.

Dá pra ler tudo por aqui: {{link_proposta}}

Na página você encontra o escopo completo, o prazo e o investimento, e pode aceitar direto por lá. A proposta vale até {{validade}}.

Qualquer dúvida é só me chamar.$msg$, 4),

-- ----- COBRANÇA -----
('Cobrança — lembrete antes do vencimento', 'cobranca', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}, tudo bem?

Passando pra lembrar que a parcela de {{valor}} ({{descricao}}) vence em {{vencimento}}.

{{link_pagamento}}

Se já tiver pago, pode ignorar essa mensagem. Obrigada!$msg$, 1),

('Cobrança — parcela atrasada', 'cobranca', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}!

A parcela de {{valor}} ({{descricao}}) venceu em {{vencimento}} e consta em aberto aqui.

{{link_pagamento}}

Se já pagou, me avisa que eu dou baixa. Se precisar de outra data ou outra forma de pagamento, me fala que a gente ajeita.$msg$, 2),

('Cobrança — link de pagamento', 'cobranca', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}! Segue o link pra pagamento de {{valor}} ({{descricao}}):

{{link_pagamento}}

Assim que cair, eu te confirmo por aqui.$msg$, 3),

-- ----- PROJETO -----
('Pedir material', 'projeto', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}!

Pra eu começar a produção do {{projeto}}, preciso que você me envie:

- Textos de cada página
- Logo em alta (de preferência PNG com fundo transparente ou o arquivo vetorial)
- Fotos que você quer usar
- Acessos (domínio e hospedagem), se já tiver

Pode mandar tudo por aqui mesmo, ou num link do Drive, como for melhor pra você. Assim que chegar, eu já entro no projeto.$msg$, 1),

('Aviso de etapa concluída', 'projeto', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}!

Novidade do {{projeto}}: terminei a etapa de {{etapa_atual}}.

Pode dar uma olhada e me dizer o que achou: {{link_projeto}}

Se tiver ajuste, me manda tudo numa mensagem só que eu já aplico.$msg$, 2),

('Entrega — projeto publicado', 'projeto', 'whatsapp', null,
$msg${{cliente_primeiro_nome}}, está no ar! 🎉

O {{projeto}} foi publicado e já pode ser acessado: {{link_projeto}}

Foi um prazer trabalhar com você. Qualquer coisa que apareça, é só me chamar — estou por aqui.$msg$, 3),

('Cobrar retorno do cliente', 'projeto', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}, tudo bem?

Estou com o {{projeto}} parado esperando seu retorno. Assim que você me mandar, eu retomo na hora.

Se tiver alguma dificuldade pra reunir o material, me fala que a gente resolve junto.$msg$, 4),

-- ----- CLIENTE -----
('Pedido de depoimento', 'cliente', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}, tudo bem?

Espero que o site esteja te ajudando a trazer cliente novo!

Queria te pedir um favor rápido: você escreveria duas ou três linhas sobre como foi trabalhar comigo? Uso esses depoimentos no meu site e na minha apresentação pra novos clientes, e vindo de você tem muito mais peso.

Sem pressa, e obrigada desde já!$msg$, 1),

('Retomar contato (pós-venda)', 'cliente', 'whatsapp', null,
$msg$Oi, {{cliente_primeiro_nome}}, quanto tempo!

Passando pra saber como estão as coisas e como o site vem se comportando.

Se estiver pensando em alguma melhoria, página nova ou campanha, me chama que eu te ajudo a planejar.$msg$, 2),

('E-mail — retomada formal', 'cliente', 'email', 'Retomando nosso contato',
$msg$Olá, {{cliente_primeiro_nome}}, tudo bem?

Escrevo para retomar nosso contato e me colocar à disposição para o que você precisar daqui pra frente.

Se houver algum ajuste, nova página ou projeto em vista, ficarei feliz em ajudar.

Um abraço,
{{contratada_nome}}
{{contratada_titulo}}$msg$, 3)

on conflict (nome) do nothing;


-- =====================================================================
-- CONFERÊNCIA · deve trazer 1 linha com "ok" e a contagem dos modelos
-- =====================================================================

select case when exists (select 1 from information_schema.tables
                         where table_schema = 'public' and table_name = 'modelos_mensagem')
            then 'ok' else 'FALTOU' end as situacao,
       (select count(*) from public.modelos_mensagem) as modelos;
