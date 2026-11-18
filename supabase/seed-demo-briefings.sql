-- =====================================================================
-- PARTE 4 do seed de demonstração: briefings respondidos pelo cliente.
-- Roda depois do seed-demo.sql. Mesmo prefixo 'dddddddd-' na limpeza.
--
-- Doce Encanto: briefing RESPONDIDO, com 3 "não sei responder" e com
-- tem_identidade = "nao" (ativa o bloco C de identidade visual).
-- Marques & Alves: briefing ENVIADO e aberto pelo cliente, ainda em branco
-- (é o estado "esperando o cliente", o que mais aparece no dia a dia).
-- =====================================================================

insert into public.briefings (id, projeto_id, token, status, respostas, enviado_em, vista_em, respondido_em, atualizado_em) values
  ('dddddddd-0000-4000-8000-00000000ba01', 'dddddddd-0000-4000-8000-00000000e002',
   'dddddddd-0000-4000-8000-00000000bb01', 'respondido',
   jsonb_build_object(
     'nome_negocio',       jsonb_build_object('t', 'Doce Encanto Confeitaria'),
     'o_que_faz',          jsonb_build_object('t', 'Bolos, doces finos e kits de festa feitos por encomenda. Atendo Curitiba e região.'),
     'tempo_atuacao',      jsonb_build_object('t', '6 anos'),
     'regioes',            jsonb_build_object('t', 'Curitiba e região metropolitana. Quero começar a enviar kits pro Brasil todo.'),
     'servicos',           jsonb_build_object('t', 'Bolos de aniversário e casamento, doces finos por cento, kits de festa, cursos presenciais.'),
     'cliente_ideal',      jsonb_build_object('t', '', 'ns', true),
     'problema_desejo',    jsonb_build_object('t', 'Quer uma festa bonita sem ter que organizar mil fornecedores diferentes.'),
     'perguntas_frequentes', jsonb_build_object('t', 'Com quantos dias de antecedência preciso pedir? Entrega? Tem opção sem lactose?'),
     'objecoes',           jsonb_build_object('t', 'Acham caro antes de ver o tamanho e o acabamento do bolo.'),
     'como_encontram',     jsonb_build_object('t', 'Instagram e indicação de cliente antigo.'),
     'diferencial',        jsonb_build_object('t', 'Massa feita no dia e recheio sem gordura hidrogenada. Faço degustação antes de casamento.'),
     'resultados',         jsonb_build_object('t', 'Mais de 400 festas atendidas e 90% dos casamentos vêm de indicação.'),
     'depoimentos',        jsonb_build_object('t', 'Tenho vários nos stories salvos, posso mandar os prints.'),
     'midia_parcerias',    jsonb_build_object('t', '', 'ns', true),
     'acao_principal',     jsonb_build_object('t', 'Fazer o pedido pelo site, sem precisar chamar no WhatsApp.'),
     'sucesso_3_meses',    jsonb_build_object('t', 'Receber pedido de kit de festa sem eu precisar responder orçamento um por um.'),
     'paginas',            jsonb_build_object('t', 'Início, Loja, Sobre, Cursos, Contato.'),
     'tres_palavras',      jsonb_build_object('t', 'afetivo, caseiro, bem feito'),
     'site_que_gosta',     jsonb_build_object('t', 'https://www.cacaushow.com.br — gosto das fotos grandes'),
     'site_que_nao_gosta', jsonb_build_object('t', 'Sites com muito texto e letra miúda, me perco.'),
     'concorrentes',       jsonb_build_object('t', 'Confeitaria Bela Massa e Ateliê do Açúcar, as duas aqui em Curitiba.'),
     'proibicoes',         jsonb_build_object('t', 'Não quero nada em roxo, e não quero a palavra "gourmet".'),
     'tem_identidade',     jsonb_build_object('t', 'nao'),
     'pasta_materiais',    jsonb_build_object('t', 'https://drive.google.com/drive/folders/exemplo-doce-encanto'),
     'fotos_equipe',       jsonb_build_object('t', 'Tenho fotos minhas na cozinha, feitas por fotógrafa, em dezembro.'),
     'dominio',            jsonb_build_object('t', 'doceencanto.com.br — já é meu, registrei no Registro.br'),
     'hospedagem',         jsonb_build_object('t', '', 'ns', true),
     'whatsapp_site',      jsonb_build_object('t', '(41) 99663-2190'),
     'email_formulario',   jsonb_build_object('t', 'juliana@doceencanto.com.br'),
     'redes_sociais',      jsonb_build_object('t', '@doceencantocwb no Instagram. Facebook eu não uso mais.'),
     'ferramentas',        jsonb_build_object('t', 'Uso o Melhor Envio pra calcular frete e PagSeguro pra receber.'),
     'quem_aprova',        jsonb_build_object('t', 'Eu mesma. Em casamento eu consulto minha irmã, que me ajuda na produção.'),
     'qtd_produtos',       jsonb_build_object('t', 'Uns 40 pra começar: bolos, doces por cento e 3 kits.'),
     'variacoes',          jsonb_build_object('t', 'Sim: tamanho (P/M/G) e sabor do recheio.'),
     'fotos_produtos',     jsonb_build_object('t', 'Tenho de uns 25. Os kits eu preciso fotografar ainda.'),
     'meios_pagamento',    jsonb_build_object('t', 'Pix e cartão. Boleto não.'),
     'envio',              jsonb_build_object('t', 'Entrega própria em Curitiba e Correios pros kits que viajam.'),
     'troca_devolucao',    jsonb_build_object('t', 'Produto é perecível, não tem troca. Erro meu eu refaço.'),
     'nota_fiscal',        jsonb_build_object('t', 'Sim, emito pelo MEI.'),
     'significado_nome',   jsonb_build_object('t', 'Era o nome do caderno de receitas da minha avó.'),
     'sensacao_marca',     jsonb_build_object('t', 'Casa de vó: cheirinho de bolo no forno, mas com acabamento profissional.'),
     'cores',              jsonb_build_object('t', 'Rosa queimado e um tom de creme. Nada de roxo.'),
     'marcas_admira',      jsonb_build_object('t', 'Gosto da identidade da Sodiê e da Kopenhagen.'),
     'onde_usada',         jsonb_build_object('t', 'Caixa, sacola, etiqueta do bolo e Instagram.')
   ),
   (current_date - 34)::timestamptz, (current_date - 33)::timestamptz, (current_date - 31)::timestamptz, (current_date - 31)::timestamptz),

  ('dddddddd-0000-4000-8000-00000000ba02', 'dddddddd-0000-4000-8000-00000000e004',
   'dddddddd-0000-4000-8000-00000000bb02', 'enviado', '{}'::jsonb,
   (current_date - 4)::timestamptz, (current_date - 3)::timestamptz, NULL, (current_date - 3)::timestamptz)
on conflict (projeto_id) do nothing;

-- ---------- LINKS PÚBLICOS PRA DEMONSTRAÇÃO ----------
-- Troque SEU-DOMINIO pelo endereço do sistema na Vercel.
select 'proposta' as tipo, p.numero as ref, p.status,
       'https://SEU-DOMINIO/p/' || p.token as link
  from public.propostas p where p.id::text like 'dddddddd-%'
union all
select 'briefing', pr.nome, b.status,
       'https://SEU-DOMINIO/b/' || b.token
  from public.briefings b join public.projetos pr on pr.id = b.projeto_id
 where b.id::text like 'dddddddd-%'
 order by tipo, ref;
