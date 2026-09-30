-- Contratos gerados pelo sistema: dados da contratada, modelos por tipo de serviço e snapshot do documento.
-- Importado dos .docx da May (modelos de contratos/). Rodar no SQL Editor depois da 009.

alter table public.configuracoes
  add column razao_social      text,
  add column endereco_empresa  text,
  add column cidade_foro       text,
  add column email_contratual  text,
  add column contrato_corpo    text;   -- cláusulas 1 a 16, comuns a todos os tipos

alter table public.contratos
  add column numero     text,          -- 001/2026
  add column documento  text,          -- markdown final, congelado na geração
  add column dados      jsonb not null default '{}'::jsonb,
  add column valor      numeric;

create table public.modelos_contrato (
  id            uuid primary key default gen_random_uuid(),
  tipo_projeto  text not null unique,  -- nome em tipos_projeto
  titulo        text not null,
  objeto        text not null,
  prazo_dias    int  not null default 30,
  prazo_extenso text not null,
  anexo         text not null,         -- Anexo I em markdown
  criado_em     timestamptz not null default now()
);
alter table public.modelos_contrato enable row level security;
create policy "auth_all" on public.modelos_contrato for all to authenticated using (true) with check (true);

-- Dados da contratada (do cabeçalho dos contratos)
update public.configuracoes set
  razao_social     = '59.367.167 MAYARA SABRINA DE LIMA',
  cnpj             = coalesce(cnpj, '59.367.167/0001-38'),
  endereco_empresa = 'Rua José Lacerda Junior, 181, Cidade Industrial, Curitiba/PR, CEP 81170-110',
  cidade_foro      = 'Curitiba/PR',
  email_contratual = 'contato@mayaralima.com.br',
  chave_pix        = coalesce(chave_pix, '59.367.167/0001-38'),
  contrato_corpo   = $corpo$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS
## {{titulo}}
Contrato nº {{numero}}

### IDENTIFICAÇÃO DAS PARTES
**CONTRATADA:** {{contratada_razao}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{contratada_cnpj}}, com sede na {{contratada_endereco}}, e-mail {{contratada_email}}, doravante denominada CONTRATADA.
**CONTRATANTE:** {{cliente_nome}}, inscrito(a) no {{cliente_tipo_documento}} sob o nº {{cliente_documento}}, com endereço em {{cliente_endereco}}, e-mail {{cliente_email}}, telefone {{cliente_telefone}}{{cliente_representante}}, doravante denominado(a) CONTRATANTE.
As partes acima identificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições a seguir.
### CLÁUSULA 1. DO OBJETO
1.1. {{objeto}}
1.2. Somente os itens descritos no Anexo I fazem parte deste contrato. Qualquer página, funcionalidade, serviço ou alteração fora desse escopo será considerado serviço adicional e dependerá de novo orçamento aprovado pelo CONTRATANTE, com valor e prazo próprios.
### CLÁUSULA 2. DAS OBRIGAÇÕES DA CONTRATADA
2.1. São obrigações da CONTRATADA:
- a) executar os serviços com técnica, profissionalismo e zelo, dentro dos prazos deste contrato;
- b) desenvolver o projeto com layout responsivo, adaptado para computador, tablet e celular;
- c) manter o CONTRATANTE informado sobre o andamento do projeto e comunicar previamente qualquer fato que altere os prazos;
- d) manter sigilo sobre informações, acessos e dados do CONTRATANTE a que tiver acesso;
- e) entregar ao CONTRATANTE os acessos administrativos do site após a quitação integral, conforme Cláusula 10.
2.2. A CONTRATADA poderá contar com colaboradores ou fornecedores em partes do trabalho, permanecendo como única responsável perante o CONTRATANTE pela execução dos serviços e como responsável exclusiva pela remuneração e pelos encargos desses colaboradores.
### CLÁUSULA 3. DAS OBRIGAÇÕES DO CONTRATANTE
3.1. São obrigações do CONTRATANTE:
- a) efetuar os pagamentos nas datas e condições acordadas;
- b) preencher o formulário de briefing e fornecer todo o material necessário ao projeto, listado no Anexo I, em até 30 (trinta) dias corridos após a assinatura deste contrato;
- c) fornecer os acessos necessários (hospedagem, domínio e contas de ferramentas de terceiros), preferencialmente pela criação de um usuário próprio para a CONTRATADA, evitando o envio de senhas pessoais por mensagem;
- d) responder às solicitações de revisão e aprovação nos prazos previstos neste contrato;
- e) indicar uma única pessoa responsável pelas aprovações, quando se tratar de empresa.
3.2. O CONTRATANTE é integralmente responsável pelo conteúdo que fornecer ou aprovar para publicação, como textos, imagens, marcas, preços, ofertas e informações, garantindo possuir os direitos de uso sobre ele e respondendo civil e criminalmente por eventual violação de direitos autorais, de imagem ou de marca, propaganda enganosa ou qualquer ato contrário à lei.
3.3. Caso o material previsto na alínea "b" não seja enviado no prazo, a CONTRATADA notificará o CONTRATANTE por e-mail. Não havendo o envio em até 7 (sete) dias corridos após a notificação, o projeto será considerado encerrado por desistência do CONTRATANTE, aplicando-se a Cláusula 12.2. A retomada posterior dependerá de disponibilidade de agenda e do pagamento de taxa de reativação de 20% (vinte por cento) do valor total do contrato.
### CLÁUSULA 4. DOS PRAZOS
4.1. O prazo de desenvolvimento é o indicado no Anexo I, contado em dias úteis a partir do primeiro dia útil seguinte à ocorrência de ambas as condições: confirmação do pagamento da primeira parcela e recebimento completo do briefing e do material.
4.2. O prazo ficará suspenso enquanto houver pendência do CONTRATANTE, como envio de material, acessos, respostas ou aprovações, sendo retomado a partir da resolução da pendência.
4.3. Atrasos causados por terceiros, como provedores de hospedagem, plataformas de pagamento e registro de domínio, ou por caso fortuito e força maior, não caracterizam descumprimento por parte da CONTRATADA.
### CLÁUSULA 5. DAS REVISÕES E APROVAÇÕES
5.1. A CONTRATADA entregará a primeira versão do projeto para avaliação por meio de link de visualização.
5.2. Estão incluídas 2 (duas) rodadas de revisão. Em cada rodada, o CONTRATANTE deverá enviar todas as solicitações de ajuste de uma única vez, por escrito (e-mail ou WhatsApp), em até 5 (cinco) dias úteis após o recebimento da versão.
5.3. As revisões devem respeitar o briefing e o escopo aprovados. Mudanças de estrutura, de identidade visual ou de informações já definidas no briefing, bem como rodadas adicionais de revisão, serão orçadas à parte.
5.4. Se o CONTRATANTE não se manifestar em até 5 (cinco) dias úteis após o envio de qualquer versão, esta será considerada aprovada para todos os efeitos, inclusive para a cobrança da parcela final.
5.5. A aprovação final será formalizada por escrito ou na forma do item 5.4. O projeto será publicado no domínio definitivo após a aprovação final e a quitação integral do valor.
### CLÁUSULA 6. DO VALOR E DA FORMA DE PAGAMENTO
6.1. Pelos serviços contratados, o CONTRATANTE pagará à CONTRATADA o valor total indicado no Anexo I.
6.2. O pagamento será realizado da seguinte forma:
{{pagamento}}
6.3. Os comprovantes de pagamento via PIX devem ser enviados para {{contratada_email}} ou pelo WhatsApp de atendimento da CONTRATADA.
6.4. A CONTRATADA emitirá nota fiscal de serviço referente aos valores recebidos.
6.5. Não estão incluídos no valor os custos de domínio, hospedagem, licenças premium e ferramentas de terceiros, salvo previsão expressa no Anexo I.
### CLÁUSULA 7. DO ATRASO NO PAGAMENTO
7.1. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a multa de 2% (dois por cento) sobre o valor devido e juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso.
7.2. Atraso superior a 15 (quinze) dias corridos autoriza a CONTRATADA a suspender os trabalhos e os prazos e, caso o site já esteja publicado, a suspender sua veiculação até a regularização, sem que isso gere direito a indenização ao CONTRATANTE.
### CLÁUSULA 8. DA HOSPEDAGEM E DO DOMÍNIO
8.1. A hospedagem do site seguirá a seguinte condição:
{{hospedagem}}
8.2. O domínio deverá ser registrado em nome do CONTRATANTE, que é responsável pelo seu pagamento e renovação, ainda que a CONTRATADA auxilie no registro.
### CLÁUSULA 9. DAS LICENÇAS E FERRAMENTAS DE TERCEIROS
9.1. O site será desenvolvido com WordPress, Elementor e os temas e plugins necessários ao escopo. Licenças premium, como Elementor Pro, temas, plugins pagos e serviços de terceiros, são de responsabilidade do CONTRATANTE, que deverá adquiri-las em seu nome e mantê-las renovadas.
9.2. Quando o Anexo I previr a inclusão de licença pela CONTRATADA, ela será fornecida apenas pelo período ali indicado. Encerrado o período, caberá ao CONTRATANTE adquirir licença própria. A não aquisição ou não renovação pode causar perda de funcionalidades, falhas de atualização ou de segurança, sem responsabilidade da CONTRATADA.
9.3. A CONTRATADA não se responsabiliza por alterações, falhas, descontinuação ou mudanças de preço de ferramentas e plataformas de terceiros.
### CLÁUSULA 10. DA PROPRIEDADE E DOS ACESSOS
10.1. Até a quitação integral, o site permanecerá sob administração exclusiva da CONTRATADA. Confirmada a quitação, a CONTRATADA entregará ao CONTRATANTE o acesso de administrador em até 7 (sete) dias úteis.
10.2. Com a quitação integral, ficam transferidos ao CONTRATANTE os direitos de uso do layout e do conteúdo desenvolvidos especificamente para o projeto. Permanecem com a CONTRATADA os métodos, estruturas e códigos genéricos reutilizáveis, sendo vedado ao CONTRATANTE revender ou reproduzir o layout como modelo para terceiros.
10.3. Alterações realizadas pelo CONTRATANTE ou por terceiros no painel administrativo encerram a responsabilidade da CONTRATADA sobre os pontos alterados e sobre as falhas deles decorrentes.
### CLÁUSULA 11. DO SUPORTE PÓS-ENTREGA E DA MANUTENÇÃO
11.1. Pelo período de 30 (trinta) dias corridos após a publicação, a CONTRATADA corrigirá gratuitamente erros de funcionamento de sua responsabilidade, como falhas de exibição, links quebrados e formulários sem funcionamento.
11.2. O suporte não inclui novas páginas, seções ou funcionalidades, alterações de conteúdo ou layout, nem problemas causados por terceiros, por atualizações feitas pelo CONTRATANTE ou por falhas e ataques em hospedagem não administrada pela CONTRATADA.
11.3. Após esse período, manutenções, atualizações e alterações serão prestadas mediante orçamento avulso ou plano de manutenção contratado à parte.
### CLÁUSULA 12. DA RESCISÃO
12.1. Este contrato poderá ser rescindido por qualquer das partes em caso de descumprimento de obrigação não sanado em até 10 (dez) dias corridos após notificação por escrito.
12.2. Em caso de rescisão pelo CONTRATANTE sem justa causa ou por desistência, inclusive na hipótese do item 3.3, o sinal não será devolvido, por remunerar a reserva de agenda e o trabalho iniciado. Se a rescisão ocorrer após a entrega da primeira versão do projeto, será devido o valor integral do contrato.
12.3. Em caso de rescisão pela CONTRATADA sem justa causa, esta devolverá integralmente os valores pagos pelo CONTRATANTE, em até 10 (dez) dias úteis.
12.4. Em qualquer hipótese de rescisão, o CONTRATANTE somente poderá utilizar o material produzido se os valores devidos estiverem quitados.
### CLÁUSULA 13. DO PORTFÓLIO
13.1. O CONTRATANTE autoriza a CONTRATADA a divulgar o projeto, capturas de tela, nome e marca em seu portfólio, site e redes sociais, sem exposição de dados confidenciais.
{{portfolio}}
### CLÁUSULA 14. DA CONFIDENCIALIDADE E DA PROTEÇÃO DE DADOS
14.1. As partes manterão sigilo sobre informações estratégicas, acessos e dados trocados durante a execução deste contrato, mesmo após o seu encerramento.
14.2. A CONTRATADA tratará os dados pessoais recebidos exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD). O CONTRATANTE, como controlador dos dados coletados pelo site por meio de formulários, cookies, pixels e compras, é responsável por validar e manter atualizada sua política de privacidade e por definir as bases legais do tratamento.
### CLÁUSULA 15. DAS DISPOSIÇÕES GERAIS
15.1. As comunicações oficiais serão feitas pelos e-mails indicados neste contrato. O WhatsApp é aceito como meio válido para envio de material, solicitações de revisão e aprovações.
15.2. As partes reconhecem como válida a assinatura deste contrato por meio de plataforma de assinatura eletrônica, nos termos da legislação vigente.
15.3. Este contrato não gera vínculo empregatício entre as partes.
15.4. A tolerância de qualquer das partes quanto ao descumprimento de cláusula não implica renúncia ou alteração do que foi pactuado.
15.5. Em caso de divergência sobre o escopo dos serviços, prevalece o descrito no Anexo I.
### CLÁUSULA 16. DO FORO
16.1. As partes elegem o foro da Comarca de {{cidade_foro}} para dirimir quaisquer questões oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.
E, por estarem justas e contratadas, as partes assinam o presente instrumento{{testemunhas_texto}}.

{{cidade_foro}}, {{data_extenso}}.

{{assinaturas}}$corpo$
where id = 1;

insert into public.modelos_contrato (tipo_projeto, titulo, objeto, prazo_dias, prazo_extenso, anexo) values (
  'Landing Page',
  'DESENVOLVIMENTO DE LANDING PAGE',
  $obj$O presente contrato tem por objeto a prestação de serviços de desenvolvimento de uma landing page, na plataforma WordPress com o construtor de páginas Elementor, conforme escopo técnico detalhado no Anexo I, parte integrante deste contrato.$obj$,
  15,
  $pz$15 (quinze) dias úteis$pz$,
  $anexo$## ANEXO I
### ESCOPO DO PROJETO

**Projeto:** {{projeto_nome}}
**Tipo:** Landing page
**Valor total:** {{valor}} ({{valor_extenso}})
**Prazo de desenvolvimento:** {{prazo_extenso}}, conforme Cláusula 4.
### 1. O QUE ESTÁ INCLUSO
- Uma página com até [8] seções, estruturada para conversão.
- Página de obrigado, exibida após o envio do formulário ou a compra.
- Layout personalizado de acordo com a identidade visual do CONTRATANTE.
- Versão responsiva, com prioridade para a experiência no celular.
- Botões de ação direcionados para [WHATSAPP / FORMULÁRIO / CHECKOUT].
- Formulário de captura com envio para o e-mail do CONTRATANTE ou integração com [FERRAMENTA DE E-MAIL MARKETING], quando indicada.
- Instalação de Pixel da Meta, Google Analytics e Google Tag Manager, com configuração de eventos básicos de conversão.
- Otimização de imagens e configurações de velocidade.
- Política de privacidade (modelo a ser validado pelo CONTRATANTE) e aviso de cookies.
- Publicação no domínio e na hospedagem definidos na Cláusula 8.
### 2. TEXTOS DO SITE
☐ Fornecidos pelo CONTRATANTE.
☐ Redação (copy) pela CONTRATADA, com base no briefing, dentro das rodadas de revisão da Cláusula 5.
### 3. LICENÇAS INCLUÍDAS PELA CONTRATADA
☐ Nenhuma. Todas as licenças premium são de responsabilidade do CONTRATANTE.
☐ [NOME DA LICENÇA], pelo período de [PERÍODO], conforme Cláusula 9.2.
### 4. MATERIAL A SER FORNECIDO PELO CONTRATANTE
- Formulário de briefing preenchido.
- Detalhes da oferta: produto ou serviço, preço, condições e bônus.
- Logotipo em alta resolução e fotos do produto, serviço ou responsável.
- Vídeo de vendas hospedado no YouTube ou Vimeo, quando houver.
- Depoimentos e provas sociais, quando houver.
- Perguntas frequentes com respostas, quando houver.
- Links de checkout, códigos de Pixel e Analytics e acessos necessários.
### 5. O QUE NÃO ESTÁ INCLUSO
- Criação de logotipo ou identidade visual.
- Produção de fotos e vídeos.
- Redação de textos, salvo se assinalada no item 2.
- E-mails corporativos e automações de e-mail marketing.
- Gestão de redes sociais, criação de anúncios e gestão de tráfego pago.
- Domínio, hospedagem e licenças premium, salvo previsão neste Anexo ou na Cláusula 8.
- Manutenção, atualizações e alterações após o período de suporte da Cláusula 11.
- Criação ou estruturação da oferta.
- Testes A/B e otimizações após a publicação.
- Páginas adicionais além da landing page e da página de obrigado.$anexo$
) on conflict (tipo_projeto) do nothing;

insert into public.modelos_contrato (tipo_projeto, titulo, objeto, prazo_dias, prazo_extenso, anexo) values (
  'Institucional',
  'DESENVOLVIMENTO DE SITE INSTITUCIONAL',
  $obj$O presente contrato tem por objeto a prestação de serviços de desenvolvimento de um site institucional, na plataforma WordPress com o construtor de páginas Elementor, conforme escopo técnico detalhado no Anexo I, parte integrante deste contrato.$obj$,
  30,
  $pz$30 (trinta) dias úteis$pz$,
  $anexo$## ANEXO I
### ESCOPO DO PROJETO

**Projeto:** {{projeto_nome}}
**Tipo:** Site institucional
**Valor total:** {{valor}} ({{valor_extenso}})
**Prazo de desenvolvimento:** {{prazo_extenso}}, conforme Cláusula 4.
### 1. O QUE ESTÁ INCLUSO
- Site com até [5] páginas: Início, Sobre, Serviços, Contato e [PÁGINA A DEFINIR].
- Layout personalizado de acordo com a identidade visual do CONTRATANTE.
- Versão responsiva para computador, tablet e celular.
- Botão flutuante de WhatsApp e formulário de contato com envio para o e-mail do CONTRATANTE.
- Mapa de localização e links para as redes sociais.
- SEO on-page básico: títulos, meta descrições, URLs amigáveis, sitemap e cadastro no Google Search Console.
- Instalação de Google Analytics, Google Tag Manager e Pixel da Meta, quando fornecidos pelo CONTRATANTE.
- Página de política de privacidade (modelo a ser validado pelo CONTRATANTE) e aviso de cookies.
- Otimização de imagens e configurações básicas de velocidade.
- Configuração de certificado SSL, quando suportado pela hospedagem.
- Publicação no domínio e na hospedagem definidos na Cláusula 8.
☐ Estrutura de blog, sem produção de artigos.
### 2. TEXTOS DO SITE
☐ Fornecidos pelo CONTRATANTE.
☐ Redação (copy) pela CONTRATADA, com base no briefing, dentro das rodadas de revisão da Cláusula 5.
### 3. LICENÇAS INCLUÍDAS PELA CONTRATADA
☐ Nenhuma. Todas as licenças premium são de responsabilidade do CONTRATANTE.
☐ [NOME DA LICENÇA], pelo período de [PERÍODO], conforme Cláusula 9.2.
### 4. MATERIAL A SER FORNECIDO PELO CONTRATANTE
- Formulário de briefing preenchido.
- Logotipo em alta resolução (preferencialmente em PNG com fundo transparente ou vetor).
- Fotos do negócio, da equipe e dos serviços, quando houver.
- Textos de cada página, caso não tenha sido contratada a redação.
- Depoimentos de clientes, quando houver.
- Dados de contato, endereço e links das redes sociais.
- Acessos ao domínio e à hospedagem, quando aplicável.
### 5. O QUE NÃO ESTÁ INCLUSO
- Criação de logotipo ou identidade visual.
- Produção de fotos e vídeos.
- Redação de textos, salvo se assinalada no item 2.
- E-mails corporativos e automações de e-mail marketing.
- Gestão de redes sociais, criação de anúncios e gestão de tráfego pago.
- Domínio, hospedagem e licenças premium, salvo previsão neste Anexo ou na Cláusula 8.
- Manutenção, atualizações e alterações após o período de suporte da Cláusula 11.
- Produção de artigos para blog.
- Integrações com CRM, sistemas de agendamento ou outras ferramentas externas.$anexo$
) on conflict (tipo_projeto) do nothing;

insert into public.modelos_contrato (tipo_projeto, titulo, objeto, prazo_dias, prazo_extenso, anexo) values (
  'E-commerce',
  'DESENVOLVIMENTO DE LOJA VIRTUAL (E-COMMERCE)',
  $obj$O presente contrato tem por objeto a prestação de serviços de desenvolvimento de uma loja virtual (e-commerce), na plataforma WordPress com o construtor de páginas Elementor, conforme escopo técnico detalhado no Anexo I, parte integrante deste contrato.$obj$,
  45,
  $pz$45 (quarenta e cinco) dias úteis$pz$,
  $anexo$## ANEXO I
### ESCOPO DO PROJETO

**Projeto:** {{projeto_nome}}
**Tipo:** Loja virtual (e-commerce)
**Valor total:** {{valor}} ({{valor_extenso}})
**Prazo de desenvolvimento:** {{prazo_extenso}}, conforme Cláusula 4.
### 1. O QUE ESTÁ INCLUSO
- Loja virtual em WordPress com WooCommerce.
- Página inicial com banners e vitrines de produtos.
- Páginas institucionais: Sobre, Contato, Política de Trocas e Devoluções, Política de Privacidade e Termos de Uso (modelos a serem validados pelo CONTRATANTE).
- Cadastro de até [20] produtos e suas categorias, com base no material enviado.
- Configuração do meio de pagamento [GATEWAY] e do cálculo de frete por [MÉTODO DE FRETE].
- Carrinho, checkout, área do cliente e sistema de cupons de desconto.
- Configuração dos e-mails automáticos padrão de pedidos.
- Botão flutuante de WhatsApp e links para as redes sociais.
- SEO básico de produtos e categorias e instalação de Google Analytics, Google Tag Manager e Pixel da Meta.
- Versão responsiva para computador, tablet e celular.
- Treinamento online de até 1 (uma) hora para cadastro de produtos e gestão de pedidos.
- Publicação no domínio e na hospedagem definidos na Cláusula 8.
### 2. TEXTOS DO SITE
☐ Fornecidos pelo CONTRATANTE.
☐ Redação (copy) pela CONTRATADA, com base no briefing, dentro das rodadas de revisão da Cláusula 5.
### 3. LICENÇAS INCLUÍDAS PELA CONTRATADA
☐ Nenhuma. Todas as licenças premium são de responsabilidade do CONTRATANTE.
☐ [NOME DA LICENÇA], pelo período de [PERÍODO], conforme Cláusula 9.2.
### 4. MATERIAL A SER FORNECIDO PELO CONTRATANTE
- Formulário de briefing preenchido.
- Logotipo em alta resolução e textos dos banners.
- Fotos de cada produto.
- Planilha de produtos com nome, descrição, preço, variações, estoque, peso e dimensões da embalagem.
- Textos das políticas de troca, devolução e entrega.
- Conta ativa no meio de pagamento e na ferramenta de frete, com os acessos necessários.
- Dados da empresa para o rodapé (CNPJ, endereço e contatos).
### 5. O QUE NÃO ESTÁ INCLUSO
- Criação de logotipo ou identidade visual.
- Produção de fotos e vídeos.
- Redação de textos, salvo se assinalada no item 2.
- E-mails corporativos e automações de e-mail marketing.
- Gestão de redes sociais, criação de anúncios e gestão de tráfego pago.
- Domínio, hospedagem e licenças premium, salvo previsão neste Anexo ou na Cláusula 8.
- Manutenção, atualizações e alterações após o período de suporte da Cláusula 11.
- Cadastro de produtos acima do limite deste Anexo, orçado por produto.
- Descrições de produtos, salvo se contratada a redação.
- Integração com ERP, marketplaces ou emissão automática de nota fiscal.
- Operação e gestão diária da loja.$anexo$
) on conflict (tipo_projeto) do nothing;
