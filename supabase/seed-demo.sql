-- =====================================================================
-- SEED DE DEMONSTRAÇÃO — 9 projetos e tudo que gira em volta.
-- Serve pra mostrar o sistema funcionando: pipeline com leads em todas as
-- etapas, propostas, contratos assinados, parcelas pagas/atrasadas,
-- despesas (inclusive recorrentes), etapas de produção e interações.
--
-- Todas as datas são relativas a current_date: o sistema sempre parece atual.
-- Todos os ids começam com 'dddddddd-' — é o que o limpar-demo.sql usa pra
-- apagar tudo sem tocar nos seus dados reais.
-- Pode rodar mais de uma vez: o "on conflict do nothing" evita duplicar.
-- =====================================================================

-- ---------- CLIENTES (7) ----------
insert into public.clientes (id, nome, empresa, nicho, email, whatsapp, instagram, origem, status, documento, endereco, contato_preferido, observacoes, criado_em) values
  ('dddddddd-0000-4000-8000-000000000001', 'Dra. Patrícia Menezes', 'Clínica Bem Viver', 'Odontologia', 'contato@clinicabemviver.com.br', '(41) 99812-4455', 'clinicabemviver', 'indicacao', 'ativo', '32.918.447/0001-02', 'Av. Sete de Setembro, 2775, Centro, Curitiba/PR, CEP 80230-010', 'whatsapp', 'Indicação da Dra. Carla. Atende convênios, quer passar imagem premium.', current_date - 240),
  ('dddddddd-0000-4000-8000-000000000002', 'Juliana Prado', 'Doce Encanto Confeitaria', 'Confeitaria', 'juliana@doceencanto.com.br', '(41) 99663-2190', 'doceencantocwb', 'instagram', 'ativo', '41.552.908/0001-77', 'Rua Padre Anchieta, 1850, Bigorrilho, Curitiba/PR, CEP 80730-000', 'whatsapp', 'Vende por encomenda e quer migrar pro e-commerce. Muito ativa no Instagram.', current_date - 180),
  ('dddddddd-0000-4000-8000-000000000003', 'Rafael Tomazini', 'Studio Pilates Equilíbrio', 'Saúde e bem-estar', 'rafael@studioequilibrio.com.br', '(41) 99201-8876', 'studioequilibriopilates', 'site', 'ativo', '28.744.120/0001-35', 'Rua Itupava, 540, Alto da XV, Curitiba/PR, CEP 80045-140', 'email', 'Quer captar aluno novo com tráfego pago. Já roda anúncios.', current_date - 95),
  ('dddddddd-0000-4000-8000-000000000004', 'Dr. Henrique Marques', 'Marques & Alves Advocacia', 'Advocacia', 'henrique@marquesalves.adv.br', '(41) 99455-7023', 'marquesalvesadv', 'indicacao', 'ativo', '19.330.657/0001-48', 'Rua Marechal Deodoro, 630, cj. 1204, Centro, Curitiba/PR, CEP 80010-010', 'email', 'Sociedade de advogados, precisa de linguagem sóbria e respeitar OAB.', current_date - 55),
  ('dddddddd-0000-4000-8000-000000000005', 'Camila Nogueira', 'Tech Hub Coworking', 'Coworking', 'camila@techhub.com.br', '(41) 99700-3341', 'techhubcwb', 'linkedin', 'ativo', '36.201.885/0001-19', 'Rua Francisco Rocha, 198, Batel, Curitiba/PR, CEP 80420-130', 'whatsapp', 'Quer blog pra ranquear no Google e atrair freelancer.', current_date - 130),
  ('dddddddd-0000-4000-8000-000000000006', 'Isabella Correia', 'Bella Nails Studio', 'Beleza', 'bella@bellanails.com.br', '(41) 99338-7762', 'bellanailsstudio', 'instagram', 'ativo', '523.114.890-07', 'Rua Brigadeiro Franco, 2300, Centro, Curitiba/PR, CEP 80250-030', 'whatsapp', 'Permuta: o site saiu em troca de serviços pro ano.', current_date - 150),
  ('dddddddd-0000-4000-8000-000000000007', 'Marcos Vinícius Leal', 'Verde Vida Paisagismo', 'Paisagismo', 'marcos@verdevidapaisagismo.com.br', '(41) 99126-5508', 'verdevidapaisagismo', 'site', 'ativo', '44.908.112/0001-60', 'Rua Konrad Adenauer, 410, Tarumã, Curitiba/PR, CEP 82820-540', 'whatsapp', 'Veio pelo formulário do site. Projeto começando agora.', current_date - 12)
on conflict (id) do nothing;

-- ---------- PROJETOS (9) ----------
insert into public.projetos (id, cliente_id, nome, tipo, status, valor_total, data_inicio, prazo_entrega, link_projeto, observacoes, criado_em) values
  -- 1. concluído há 2 meses, tudo pago
  ('dddddddd-0000-4000-8000-00000000e001', 'dddddddd-0000-4000-8000-000000000001', 'Site institucional — Clínica Bem Viver', 'Institucional', 'concluido', 5800.00, current_date - 220, current_date - 185, 'https://clinicabemviver.com.br', 'Entregue no prazo. Cliente pediu treinamento extra do painel.', current_date - 235),
  -- 2. em desenvolvimento, metade das etapas feitas
  ('dddddddd-0000-4000-8000-00000000e002', 'dddddddd-0000-4000-8000-000000000002', 'Loja virtual — Doce Encanto', 'E-commerce', 'em_desenvolvimento', 9400.00, current_date - 38, current_date + 14, NULL, 'WooCommerce com 40 produtos. Frete por Melhor Envio.', current_date - 52),
  -- 3. em revisão, entrega essa semana
  ('dddddddd-0000-4000-8000-00000000e003', 'dddddddd-0000-4000-8000-000000000003', 'LP de captação — Studio Equilíbrio', 'Landing Page', 'em_revisao', 3200.00, current_date - 22, current_date + 3, 'https://studioequilibrio.com.br/aula-experimental', 'Segunda rodada de revisão. Falta aprovar os textos da seção de planos.', current_date - 30),
  -- 4. aprovado, acabou de começar
  ('dddddddd-0000-4000-8000-00000000e004', 'dddddddd-0000-4000-8000-000000000004', 'Site institucional — Marques & Alves', 'Institucional', 'aprovado', 7200.00, current_date - 5, current_date + 37, NULL, 'Aguardando material: fotos da equipe e textos das áreas de atuação.', current_date - 18),
  -- 5. entregue, falta a última parcela
  ('dddddddd-0000-4000-8000-00000000e005', 'dddddddd-0000-4000-8000-000000000005', 'Site + blog — Tech Hub', 'Blog', 'entregue', 6500.00, current_date - 110, current_date - 62, 'https://techhub.com.br', 'Publicado. Parcela final combinada pra 30 dias depois da entrega.', current_date - 125),
  -- 6. concluído (permuta)
  ('dddddddd-0000-4000-8000-00000000e006', 'dddddddd-0000-4000-8000-000000000006', 'Landing page — Bella Nails', 'Landing Page', 'concluido', 2800.00, current_date - 140, current_date - 118, 'https://bellanails.com.br', 'Permuta: serviços de manicure por 12 meses.', current_date - 148),
  -- 7. briefing (proposta aceita, contrato em andamento)
  ('dddddddd-0000-4000-8000-00000000e007', 'dddddddd-0000-4000-8000-000000000007', 'Site institucional — Verde Vida', 'Institucional', 'briefing', 6900.00, NULL, current_date + 52, NULL, 'Proposta aceita pelo cliente. Falta assinar o contrato e preencher o briefing.', current_date - 10),
  -- 8. segundo projeto do mesmo cliente (mostra recorrência)
  ('dddddddd-0000-4000-8000-00000000e008', 'dddddddd-0000-4000-8000-000000000002', 'LP Dia das Mães — Doce Encanto', 'Landing Page', 'concluido', 2400.00, current_date - 95, current_date - 78, 'https://doceencanto.com.br/dia-das-maes', 'Campanha sazonal. Cliente quer repetir no Natal.', current_date - 100),
  -- 9. orçamento enviado (upsell no cliente antigo)
  ('dddddddd-0000-4000-8000-00000000e009', 'dddddddd-0000-4000-8000-000000000001', 'LP de implantes — Clínica Bem Viver', 'Página de Vendas', 'orcamento_enviado', 4100.00, NULL, NULL, NULL, 'Upsell. Cliente pediu pra retomar depois do Carnaval.', current_date - 9)
on conflict (id) do nothing;

-- ---------- PAGAMENTOS ----------
-- Recebidos (alimentam receita dos últimos meses, relatórios e resumo de lucro)
insert into public.pagamentos (id, projeto_id, tipo, valor, vencimento, forma_pagamento, data_pagamento) values
  ('dddddddd-0000-4000-8000-00000000a001', 'dddddddd-0000-4000-8000-00000000e001', 'entrada', 2900.00, current_date - 220, 'pix', current_date - 220),
  ('dddddddd-0000-4000-8000-00000000a002', 'dddddddd-0000-4000-8000-00000000e001', 'final', 2900.00, current_date - 185, 'pix', current_date - 183),
  ('dddddddd-0000-4000-8000-00000000a003', 'dddddddd-0000-4000-8000-00000000e006', 'pagamento_unico', 2800.00, current_date - 140, 'permuta', current_date - 140),
  ('dddddddd-0000-4000-8000-00000000a004', 'dddddddd-0000-4000-8000-00000000e005', 'entrada', 3250.00, current_date - 110, 'transferencia', current_date - 109),
  ('dddddddd-0000-4000-8000-00000000a005', 'dddddddd-0000-4000-8000-00000000e008', 'entrada', 1200.00, current_date - 95, 'pix', current_date - 95),
  ('dddddddd-0000-4000-8000-00000000a006', 'dddddddd-0000-4000-8000-00000000e008', 'final', 1200.00, current_date - 78, 'pix', current_date - 76),
  ('dddddddd-0000-4000-8000-00000000a007', 'dddddddd-0000-4000-8000-00000000e002', 'entrada', 4700.00, current_date - 38, 'pix', current_date - 38),
  ('dddddddd-0000-4000-8000-00000000a008', 'dddddddd-0000-4000-8000-00000000e003', 'entrada', 1600.00, current_date - 22, 'cartao', current_date - 22),
  ('dddddddd-0000-4000-8000-00000000a009', 'dddddddd-0000-4000-8000-00000000e004', 'entrada', 3600.00, current_date - 5, 'pix', current_date - 4),
  -- Em atraso (aparece vermelho no Financeiro e no resumo diário)
  ('dddddddd-0000-4000-8000-00000000a010', 'dddddddd-0000-4000-8000-00000000e005', 'final', 3250.00, current_date - 11, 'boleto', NULL),
  -- A receber
  ('dddddddd-0000-4000-8000-00000000a011', 'dddddddd-0000-4000-8000-00000000e003', 'final', 1600.00, current_date + 4, 'cartao', NULL),
  ('dddddddd-0000-4000-8000-00000000a012', 'dddddddd-0000-4000-8000-00000000e002', 'parcela', 2350.00, current_date + 8, 'pix', NULL),
  ('dddddddd-0000-4000-8000-00000000a013', 'dddddddd-0000-4000-8000-00000000e002', 'final', 2350.00, current_date + 38, 'pix', NULL),
  ('dddddddd-0000-4000-8000-00000000a014', 'dddddddd-0000-4000-8000-00000000e004', 'final', 3600.00, current_date + 40, 'pix', NULL)
on conflict (id) do nothing;

-- ---------- CONTRATOS ----------
insert into public.contratos (id, projeto_id, status, numero, valor, link_documento, data_envio, data_assinatura, criado_em) values
  ('dddddddd-0000-4000-8000-00000000c001', 'dddddddd-0000-4000-8000-00000000e001', 'assinado', '001/2026', 5800.00, NULL, current_date - 228, current_date - 226, current_date - 230),
  ('dddddddd-0000-4000-8000-00000000c002', 'dddddddd-0000-4000-8000-00000000e005', 'assinado', '002/2026', 6500.00, NULL, current_date - 120, current_date - 118, current_date - 122),
  ('dddddddd-0000-4000-8000-00000000c003', 'dddddddd-0000-4000-8000-00000000e002', 'assinado', '003/2026', 9400.00, NULL, current_date - 45, current_date - 42, current_date - 48),
  ('dddddddd-0000-4000-8000-00000000c004', 'dddddddd-0000-4000-8000-00000000e004', 'assinado', '004/2026', 7200.00, NULL, current_date - 12, current_date - 8, current_date - 15),
  -- aguardando assinatura (aparece como pendência)
  ('dddddddd-0000-4000-8000-00000000c005', 'dddddddd-0000-4000-8000-00000000e007', 'enviado', '005/2026', 6900.00, NULL, current_date - 3, NULL, current_date - 4)
on conflict (id) do nothing;

-- ---------- LEADS (8, em todas as etapas) ----------
insert into public.leads (id, nome, empresa, whatsapp, email, instagram, origem, entrada, servico_interesse, valor_estimado, etapa, prioridade, motivo_perda, proximo_followup, nota_followup, mensagem, respostas, criado_em, atualizado_em) values
  ('dddddddd-0000-4000-8000-00000000b001', 'Fernanda Shiraishi', 'Nutri Fernanda', '(41) 99815-2240', 'contato@nutrifernanda.com.br', 'nutrifernandas', 'site', 'formulario', 'Landing Page', 3500.00, 'novo', 'alta', NULL, current_date, 'Responder contato novo', 'Quero uma página pra captar paciente pelo Instagram, tenho tráfego mas nada converte.', '{"Qual o segmento do seu negócio?": "Saúde e bem-estar", "Qual o prazo pra entrega do projeto?": "Até 30 dias", "Qual a faixa de investimento está disposto a pagar no seu projeto?": "De R$3000 à R$5000", "Qual melhor horário pra uma chamada de vídeo de 30 min?": "Manhã"}'::jsonb, current_date - 1, current_date - 1),
  ('dddddddd-0000-4000-8000-00000000b002', 'Thiago Albuquerque', 'TA Barbearia', '(41) 99234-8890', NULL, 'tabarbearia', 'instagram', 'manychat', 'Página de Links', 900.00, 'novo', 'media', NULL, current_date, 'Responder contato novo', 'Oi! Vi seu trabalho e queria uma página com meus links e agendamento.', '{"Qual o segmento do seu negócio?": "Beleza"}'::jsonb, current_date - 2, current_date - 2),
  ('dddddddd-0000-4000-8000-00000000b003', 'Larissa Antunes', 'Ateliê Casa Nova', '(41) 99702-1167', 'larissa@ateliecasanova.com.br', 'ateliecasanova', 'indicacao', 'manual', 'E-commerce', 8000.00, 'em_contato', 'alta', NULL, current_date + 2, 'Mandar referências de loja virtual de decoração', 'Indicada pela Juliana da Doce Encanto.', '{}'::jsonb, current_date - 9, current_date - 4),
  -- follow-up atrasado: aparece com anel vermelho no kanban
  ('dddddddd-0000-4000-8000-00000000b004', 'Eduardo Panizzi', 'Panizzi Odontologia', '(41) 99540-3312', 'eduardo@panizziodonto.com.br', NULL, 'indicacao', 'manual', 'Institucional', 6000.00, 'em_contato', 'alta', NULL, current_date - 4, 'Retomar: pediu pra chamar depois do congresso', 'Conversamos no evento. Quer site novo, o atual é de 2018.', '{}'::jsonb, current_date - 25, current_date - 14),
  ('dddddddd-0000-4000-8000-00000000b005', 'Gabriela Stein', 'Stein Arquitetura', '(41) 99881-4406', 'gabriela@steinarq.com.br', 'steinarquitetura', 'linkedin', 'manual', 'Institucional', 7500.00, 'proposta_enviada', 'alta', NULL, current_date + 1, 'Retornar sobre a proposta P-002/2026', 'Quer portfólio de projetos com galeria boa no celular.', '{}'::jsonb, current_date - 16, current_date - 6),
  ('dddddddd-0000-4000-8000-00000000b006', 'Rodrigo Bianchi', 'Bianchi Suplementos', '(41) 99317-2255', 'rodrigo@bianchisupp.com.br', 'bianchisuplementos', 'instagram', 'manychat', 'E-commerce', 12000.00, 'negociando', 'alta', NULL, current_date, 'Enviar contrato — proposta P-003/2026 aceita', 'Loja com 80 produtos. Já tem fornecedor de frete.', '{}'::jsonb, current_date - 21, current_date - 2),
  ('dddddddd-0000-4000-8000-00000000b007', 'Marcos Vinícius Leal', 'Verde Vida Paisagismo', '(41) 99126-5508', 'marcos@verdevidapaisagismo.com.br', 'verdevidapaisagismo', 'site', 'formulario', 'Institucional', 6900.00, 'ganho', 'alta', NULL, NULL, NULL, 'Preciso de um site pra mostrar os projetos de paisagismo.', '{}'::jsonb, current_date - 28, current_date - 11),
  ('dddddddd-0000-4000-8000-00000000b008', 'Priscila Matoso', 'Matoso Pet Shop', '(41) 99445-9980', 'priscila@matosopet.com.br', NULL, 'site', 'formulario', 'E-commerce', 9000.00, 'perdido', 'media', 'Preço acima do orçamento dela; vai fazer no Wix por enquanto.', NULL, NULL, 'Quero vender ração online.', '{}'::jsonb, current_date - 47, current_date - 33)
on conflict (id) do nothing;

-- liga o cliente convertido ao lead de origem
update public.clientes set lead_id = 'dddddddd-0000-4000-8000-00000000b007' where id = 'dddddddd-0000-4000-8000-000000000007';

-- ---------- PROPOSTAS (3) ----------
insert into public.propostas (id, numero, lead_id, cliente_id, tipo_projeto, titulo, documento, dados, valor, prazo_extenso, validade, status, enviada_em, vista_em, respondida_em, resposta_cliente, criado_em, atualizado_em) values
  ('dddddddd-0000-4000-8000-00000000f001', 'P-001/2026', 'dddddddd-0000-4000-8000-00000000b007', NULL, 'Institucional', 'Site institucional — Verde Vida Paisagismo',
   E'# PROPOSTA COMERCIAL\n## Site institucional — Verde Vida Paisagismo\nProposta nº P-001/2026\n\n### PARA\n**Verde Vida Paisagismo**\nmarcos@verdevidapaisagismo.com.br · (41) 99126-5508\n\n### APRESENTAÇÃO\nOlá, Marcos! Obrigada pelo contato.\n\nPreparei esta proposta a partir do que conversamos: um site que mostre seus projetos de paisagismo com qualidade de imagem e traga pedidos de orçamento pelo WhatsApp.\n\n### O QUE VOCÊ RECEBE\n- Site com até 5 páginas: Início, Sobre, Serviços, Projetos e Contato.\n- Galeria de projetos com fotos em alta e carregamento otimizado.\n- Layout personalizado de acordo com a identidade visual.\n- Versão responsiva para computador, tablet e celular.\n- Botão flutuante de WhatsApp e formulário de orçamento.\n- SEO on-page básico e Google Search Console.\n\n### PRAZO\n30 (trinta) dias úteis, contados a partir da confirmação do primeiro pagamento e do recebimento do material.\n\n### INVESTIMENTO\n**R$ 6.900,00** (seis mil e novecentos reais)\n\n- 50% (R$ 3.450,00) na assinatura do contrato, a título de sinal e reserva de agenda.\n- 50% (R$ 3.450,00) na aprovação final, antes da publicação.\n\n### VALIDADE\nEsta proposta vale até ' || to_char(current_date + 3, 'DD/MM/YYYY') || E'.',
   '{"condicao": "50_50"}'::jsonb, 6900.00, '30 (trinta) dias úteis', current_date + 3, 'aceita', (current_date - 14)::timestamptz, (current_date - 13)::timestamptz, (current_date - 11)::timestamptz, NULL, current_date - 15, current_date - 11),
  ('dddddddd-0000-4000-8000-00000000f002', 'P-002/2026', 'dddddddd-0000-4000-8000-00000000b005', NULL, 'Institucional', 'Site institucional — Stein Arquitetura',
   E'# PROPOSTA COMERCIAL\n## Site institucional — Stein Arquitetura\nProposta nº P-002/2026\n\n### PARA\n**Stein Arquitetura**\ngabriela@steinarq.com.br · (41) 99881-4406\n\n### APRESENTAÇÃO\nOlá, Gabriela! Obrigada pelo contato.\n\nPreparei esta proposta pensando no que conversamos: um portfólio que valorize os projetos e funcione muito bem no celular, que é de onde vem a maior parte das visitas.\n\n### O QUE VOCÊ RECEBE\n- Site com até 5 páginas, incluindo portfólio com galeria por projeto.\n- Layout personalizado, com foco em imagem grande e tipografia limpa.\n- Versão responsiva para computador, tablet e celular.\n- Formulário de contato e botão de WhatsApp.\n- SEO on-page básico e integração com Google Analytics.\n\n### PRAZO\n30 (trinta) dias úteis, contados a partir da confirmação do primeiro pagamento e do recebimento do material.\n\n### INVESTIMENTO\n**R$ 7.500,00** (sete mil e quinhentos reais)\n\n- Entrada de R$ 2.500,00 na assinatura do contrato.\n- 2 parcelas de R$ 2.500,00, com vencimento a cada 30 dias.\n\n### VALIDADE\nEsta proposta vale até ' || to_char(current_date + 4, 'DD/MM/YYYY') || E'.',
   '{"condicao": "entrada_2x"}'::jsonb, 7500.00, '30 (trinta) dias úteis', current_date + 4, 'enviada', (current_date - 6)::timestamptz, (current_date - 5)::timestamptz, NULL, NULL, current_date - 7, current_date - 6),
  ('dddddddd-0000-4000-8000-00000000f003', 'P-003/2026', 'dddddddd-0000-4000-8000-00000000b006', NULL, 'E-commerce', 'Loja virtual — Bianchi Suplementos',
   E'# PROPOSTA COMERCIAL\n## Loja virtual — Bianchi Suplementos\nProposta nº P-003/2026\n\n### PARA\n**Bianchi Suplementos**\nrodrigo@bianchisupp.com.br · (41) 99317-2255\n\n### APRESENTAÇÃO\nOlá, Rodrigo! Obrigada pelo contato.\n\nMontei esta proposta para tirar a loja do papel com estrutura de verdade: catálogo organizado, checkout confiável e frete calculado certo.\n\n### O QUE VOCÊ RECEBE\n- Loja virtual em WordPress com WooCommerce.\n- Cadastro de até 80 produtos e suas categorias.\n- Configuração de meio de pagamento e cálculo de frete.\n- Carrinho, checkout, área do cliente e cupons de desconto.\n- Treinamento online de 1 hora para gestão de pedidos.\n\n### PRAZO\n45 (quarenta e cinco) dias úteis, contados a partir da confirmação do primeiro pagamento e do recebimento do material.\n\n### INVESTIMENTO\n**R$ 12.000,00** (doze mil reais)\n\n- Entrada de R$ 3.000,00 na assinatura do contrato.\n- 3 parcelas de R$ 3.000,00, com vencimento a cada 30 dias.\n\n### VALIDADE\nEsta proposta vale até ' || to_char(current_date + 5, 'DD/MM/YYYY') || E'.',
   '{"condicao": "entrada_3x"}'::jsonb, 12000.00, '45 (quarenta e cinco) dias úteis', current_date + 5, 'aceita', (current_date - 5)::timestamptz, (current_date - 4)::timestamptz, (current_date - 2)::timestamptz, 'Fechado! Só me manda o contrato que eu assino hoje.', current_date - 6, current_date - 2)
on conflict (id) do nothing;

-- ---------- ETAPAS DE PRODUÇÃO (tarefas com ordem) ----------
-- Projeto 2 (e-commerce em desenvolvimento): metade feita, uma atrasada
insert into public.tarefas (id, titulo, descricao, projeto_id, categoria, prioridade, vencimento, concluida_em, ordem, criado_em) values
  ('dddddddd-0000-4000-8000-0000002e0001', 'Reunião de briefing', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Briefing', 'media', current_date - 38, (current_date - 38)::timestamptz, 1, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0002', 'Catálogo de produtos e conteúdo', 'Planilha com 40 produtos, fotos e descrições.', 'dddddddd-0000-4000-8000-00000000e002', 'Conteúdo', 'alta', current_date - 31, (current_date - 29)::timestamptz, 2, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0003', 'Wireframe', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Wireframe', 'media', current_date - 28, (current_date - 27)::timestamptz, 3, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0004', 'Layout', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Layout', 'alta', current_date - 21, (current_date - 20)::timestamptz, 4, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0005', 'Aprovação do layout', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Aprovação do cliente', 'alta', current_date - 18, (current_date - 16)::timestamptz, 5, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0006', 'Desenvolvimento', 'Montagem da loja, produtos e categorias.', 'dddddddd-0000-4000-8000-00000000e002', 'Desenvolvimento', 'alta', current_date - 3, NULL, 6, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0007', 'Pagamento, frete e cadastro de produtos', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Desenvolvimento', 'alta', current_date + 4, NULL, 7, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0008', 'Revisão e testes de compra', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Revisão', 'media', current_date + 9, NULL, 8, current_date - 38),
  ('dddddddd-0000-4000-8000-0000002e0009', 'Publicação', NULL, 'dddddddd-0000-4000-8000-00000000e002', 'Publicação', 'alta', current_date + 13, NULL, 9, current_date - 38),
  -- Projeto 3 (LP em revisão): quase tudo feito
  ('dddddddd-0000-4000-8000-0000003e0001', 'Reunião de briefing', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Briefing', 'media', current_date - 22, (current_date - 22)::timestamptz, 1, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0002', 'Receber conteúdo e materiais', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Conteúdo', 'media', current_date - 19, (current_date - 18)::timestamptz, 2, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0003', 'Wireframe', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Wireframe', 'media', current_date - 16, (current_date - 16)::timestamptz, 3, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0004', 'Layout', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Layout', 'alta', current_date - 12, (current_date - 11)::timestamptz, 4, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0005', 'Aprovação do layout', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Aprovação do cliente', 'alta', current_date - 9, (current_date - 8)::timestamptz, 5, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0006', 'Desenvolvimento', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Desenvolvimento', 'alta', current_date - 2, (current_date - 2)::timestamptz, 6, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0007', 'Revisão e testes', 'Segunda rodada: ajustes na seção de planos.', 'dddddddd-0000-4000-8000-00000000e003', 'Revisão', 'alta', current_date, NULL, 7, current_date - 22),
  ('dddddddd-0000-4000-8000-0000003e0008', 'Publicação', NULL, 'dddddddd-0000-4000-8000-00000000e003', 'Publicação', 'alta', current_date + 3, NULL, 8, current_date - 22),
  -- Projeto 4 (aprovado, começando)
  ('dddddddd-0000-4000-8000-0000004e0001', 'Reunião de briefing', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Briefing', 'alta', current_date - 5, (current_date - 5)::timestamptz, 1, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0002', 'Receber conteúdo e materiais', 'Fotos da equipe e textos das áreas de atuação.', 'dddddddd-0000-4000-8000-00000000e004', 'Conteúdo', 'alta', current_date, NULL, 2, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0003', 'Wireframe', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Wireframe', 'media', current_date + 3, NULL, 3, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0004', 'Layout', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Layout', 'alta', current_date + 9, NULL, 4, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0005', 'Aprovação do layout', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Aprovação do cliente', 'alta', current_date + 12, NULL, 5, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0006', 'Desenvolvimento', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Desenvolvimento', 'alta', current_date + 22, NULL, 6, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0007', 'Revisão e testes', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Revisão', 'media', current_date + 30, NULL, 7, current_date - 5),
  ('dddddddd-0000-4000-8000-0000004e0008', 'Publicação', NULL, 'dddddddd-0000-4000-8000-00000000e004', 'Publicação', 'alta', current_date + 36, NULL, 8, current_date - 5)
on conflict (id) do nothing;

-- ---------- TAREFAS AVULSAS (agenda do dia) ----------
insert into public.tarefas (id, titulo, descricao, cliente_id, lead_id, categoria, prioridade, vencimento, concluida_em, criado_em) values
  ('dddddddd-0000-4000-8000-0000000aa001', 'Ligar pra Fernanda sobre a landing page', 'Primeiro contato: entender a oferta e o funil atual.', NULL, 'dddddddd-0000-4000-8000-00000000b001', 'Ligação', 'alta', current_date, NULL, current_date - 1),
  ('dddddddd-0000-4000-8000-0000000aa002', 'Enviar contrato — Bianchi Suplementos', 'Proposta P-003 aceita. Gerar contrato e mandar pra assinatura.', NULL, 'dddddddd-0000-4000-8000-00000000b006', 'Contrato', 'alta', current_date, NULL, current_date - 2),
  ('dddddddd-0000-4000-8000-0000000aa003', 'Cobrar parcela final — Tech Hub', 'Boleto venceu há 11 dias. Mandar segunda via.', 'dddddddd-0000-4000-8000-000000000005', NULL, 'Follow-up', 'alta', current_date - 2, NULL, current_date - 5),
  ('dddddddd-0000-4000-8000-0000000aa004', 'Retomar Panizzi Odontologia', 'Congresso já acabou, pode ligar.', NULL, 'dddddddd-0000-4000-8000-00000000b004', 'Follow-up', 'media', current_date - 4, NULL, current_date - 14),
  ('dddddddd-0000-4000-8000-0000000aa005', 'Mandar referências pra Larissa', 'Lojas de decoração com boa navegação.', NULL, 'dddddddd-0000-4000-8000-00000000b003', 'E-mail', 'media', current_date + 2, NULL, current_date - 4),
  ('dddddddd-0000-4000-8000-0000000aa006', 'Renovação de manutenção — Clínica Bem Viver', 'Plano anual vence mês que vem.', 'dddddddd-0000-4000-8000-000000000001', NULL, 'Follow-up', 'baixa', current_date + 12, NULL, current_date - 7),
  ('dddddddd-0000-4000-8000-0000000aa007', 'Postar case do Studio Equilíbrio', NULL, NULL, NULL, 'Outro', 'baixa', current_date - 3, (current_date - 3)::timestamptz, current_date - 8)
on conflict (id) do nothing;

-- ---------- DESPESAS ----------
-- Fixas recorrentes (o cron lança as próximas sozinho)
insert into public.despesas (id, descricao, categoria, valor, data, pago_em, forma_pagamento, fornecedor, projeto_id, recorrente, periodicidade, observacoes, criado_em) values
  ('dddddddd-0000-4000-8000-00000000d001', 'Hospedagem VPS', 'Hospedagem', 139.90, date_trunc('month', current_date)::date + 9, date_trunc('month', current_date)::date + 9, 'cartao', 'Hostinger', NULL, true, 'mensal', 'Servidor que hospeda os sites dos clientes.', current_date - 200),
  ('dddddddd-0000-4000-8000-00000000d002', 'Adobe Creative Cloud', 'Ferramentas e assinaturas', 119.00, date_trunc('month', current_date)::date + 4, date_trunc('month', current_date)::date + 4, 'cartao', 'Adobe', NULL, true, 'mensal', NULL, current_date - 200),
  ('dddddddd-0000-4000-8000-00000000d003', 'Internet fibra', 'Ferramentas e assinaturas', 129.90, date_trunc('month', current_date)::date + 14, NULL, 'boleto', 'Vivo', NULL, true, 'mensal', NULL, current_date - 200),
  ('dddddddd-0000-4000-8000-00000000d004', 'Elementor Pro', 'Licenças e plugins', 499.00, current_date - 70, current_date - 70, 'cartao', 'Elementor', NULL, true, 'anual', 'Licença de 1000 sites.', current_date - 70),
  ('dddddddd-0000-4000-8000-00000000d005', 'Contador', 'Contador', 320.00, date_trunc('month', current_date)::date + 19, NULL, 'pix', 'Escritório Contábil Paraná', NULL, true, 'mensal', NULL, current_date - 200),
-- Avulsas dos últimos meses (dão volume ao resumo de lucro)
  ('dddddddd-0000-4000-8000-00000000d006', 'Hospedagem VPS', 'Hospedagem', 139.90, (date_trunc('month', current_date) - interval '1 month')::date + 9, (date_trunc('month', current_date) - interval '1 month')::date + 9, 'cartao', 'Hostinger', NULL, false, NULL, NULL, current_date - 40),
  ('dddddddd-0000-4000-8000-00000000d007', 'Hospedagem VPS', 'Hospedagem', 139.90, (date_trunc('month', current_date) - interval '2 month')::date + 9, (date_trunc('month', current_date) - interval '2 month')::date + 9, 'cartao', 'Hostinger', NULL, false, NULL, NULL, current_date - 70),
  ('dddddddd-0000-4000-8000-00000000d008', 'Adobe Creative Cloud', 'Ferramentas e assinaturas', 119.00, (date_trunc('month', current_date) - interval '1 month')::date + 4, (date_trunc('month', current_date) - interval '1 month')::date + 4, 'cartao', 'Adobe', NULL, false, NULL, NULL, current_date - 40),
  ('dddddddd-0000-4000-8000-00000000d009', 'Adobe Creative Cloud', 'Ferramentas e assinaturas', 119.00, (date_trunc('month', current_date) - interval '2 month')::date + 4, (date_trunc('month', current_date) - interval '2 month')::date + 4, 'cartao', 'Adobe', NULL, false, NULL, NULL, current_date - 70),
  ('dddddddd-0000-4000-8000-00000000d010', 'Anúncios — captação de clientes', 'Anúncios e marketing', 600.00, (date_trunc('month', current_date) - interval '1 month')::date + 2, (date_trunc('month', current_date) - interval '1 month')::date + 2, 'cartao', 'Meta Ads', NULL, false, NULL, 'Campanha de 15 dias no Instagram.', current_date - 42),
  ('dddddddd-0000-4000-8000-00000000d011', 'Domínio doceencanto.com.br', 'Domínio', 40.00, current_date - 36, current_date - 36, 'cartao', 'Registro.br', 'dddddddd-0000-4000-8000-00000000e002', false, NULL, 'Custo direto do projeto.', current_date - 36),
  ('dddddddd-0000-4000-8000-00000000d012', 'Banco de imagens (1 mês)', 'Ferramentas e assinaturas', 89.00, current_date - 24, current_date - 24, 'cartao', 'Envato', 'dddddddd-0000-4000-8000-00000000e003', false, NULL, 'Fotos da landing page do Studio.', current_date - 24),
  ('dddddddd-0000-4000-8000-00000000d013', 'Curso de copywriting', 'Cursos e livros', 497.00, current_date - 58, current_date - 58, 'cartao', 'Hotmart', NULL, false, NULL, NULL, current_date - 58),
  ('dddddddd-0000-4000-8000-00000000d014', 'Cadeira de escritório', 'Equipamento', 1290.00, current_date - 88, current_date - 88, 'cartao', 'Mercado Livre', NULL, false, NULL, 'Parcelado em 10x, lançado à vista.', current_date - 88)
on conflict (id) do nothing;

-- ---------- INTERAÇÕES ----------
insert into public.interacoes (id, lead_id, cliente_id, data, canal, resumo) values
  ('dddddddd-0000-4000-8000-0000000ff001', 'dddddddd-0000-4000-8000-00000000b005', NULL, current_date - 6, 'email', 'Proposta P-002/2026 enviada (R$ 7.500,00)'),
  ('dddddddd-0000-4000-8000-0000000ff002', 'dddddddd-0000-4000-8000-00000000b005', NULL, current_date - 5, 'whatsapp', 'Confirmou que recebeu, vai conversar com o sócio.'),
  ('dddddddd-0000-4000-8000-0000000ff003', 'dddddddd-0000-4000-8000-00000000b006', NULL, current_date - 2, 'outro', 'Proposta P-003/2026 ACEITA pelo cliente: Fechado! Só me manda o contrato que eu assino hoje.'),
  ('dddddddd-0000-4000-8000-0000000ff004', 'dddddddd-0000-4000-8000-00000000b003', NULL, current_date - 4, 'whatsapp', 'Pediu referências de loja virtual de decoração.'),
  ('dddddddd-0000-4000-8000-0000000ff005', 'dddddddd-0000-4000-8000-00000000b004', NULL, current_date - 14, 'ligacao', 'Pediu pra retomar depois do congresso de odontologia.'),
  ('dddddddd-0000-4000-8000-0000000ff006', 'dddddddd-0000-4000-8000-00000000b008', NULL, current_date - 33, 'whatsapp', 'Achou caro, vai tentar no Wix. Deixei a porta aberta.'),
  ('dddddddd-0000-4000-8000-0000000ff007', NULL, 'dddddddd-0000-4000-8000-000000000005', current_date - 9, 'email', 'Cobrança da parcela final enviada. Disse que paga essa semana.'),
  ('dddddddd-0000-4000-8000-0000000ff008', NULL, 'dddddddd-0000-4000-8000-000000000003', current_date - 8, 'whatsapp', 'Aprovou o layout. Pediu ajuste nos textos da seção de planos.'),
  ('dddddddd-0000-4000-8000-0000000ff009', NULL, 'dddddddd-0000-4000-8000-000000000002', current_date - 16, 'reuniao', 'Reunião de aprovação do layout da loja. Aprovado com ajustes no menu.'),
  ('dddddddd-0000-4000-8000-0000000ff010', NULL, 'dddddddd-0000-4000-8000-000000000001', current_date - 20, 'whatsapp', 'Perguntou sobre landing page de implantes. Enviei orçamento.')
on conflict (id) do nothing;

-- follow-up de pós-venda em dois clientes
update public.clientes set proximo_followup = current_date + 12, nota_followup = 'Oferecer plano de manutenção anual' where id = 'dddddddd-0000-4000-8000-000000000001';
update public.clientes set proximo_followup = current_date - 2, nota_followup = 'Cobrar parcela final do site' where id = 'dddddddd-0000-4000-8000-000000000005';

-- ---------- CONFERÊNCIA ----------
select 'clientes' as tabela, count(*) from public.clientes where id::text like 'dddddddd-%'
union all select 'projetos',   count(*) from public.projetos   where id::text like 'dddddddd-%'
union all select 'leads',      count(*) from public.leads      where id::text like 'dddddddd-%'
union all select 'propostas',  count(*) from public.propostas  where id::text like 'dddddddd-%'
union all select 'contratos',  count(*) from public.contratos  where id::text like 'dddddddd-%'
union all select 'pagamentos', count(*) from public.pagamentos where id::text like 'dddddddd-%'
union all select 'despesas',   count(*) from public.despesas   where id::text like 'dddddddd-%'
union all select 'tarefas',    count(*) from public.tarefas    where id::text like 'dddddddd-%'
union all select 'interacoes', count(*) from public.interacoes where id::text like 'dddddddd-%';
