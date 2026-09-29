# Briefing de Diagnóstico (pré-venda) · May Gestão

## Instruções para o Claude Code

Adicionar ao sistema May Gestão um **modelo de briefing** chamado "Diagnóstico (pré-venda)", usando a estrutura de pergunta e resposta que já existe.

Antes de implementar:

1. Leia o schema atual de briefing (tabelas, tipos e componentes) e adapte esta especificação ao que já existe. Não recrie o que já funciona.
2. Não altere nem apague briefings já preenchidos. Qualquer mudança de schema deve ser via migration aditiva.
3. Se o sistema ainda não suportar algum item abaixo (tipos de campo, seções, trilhas condicionais), implemente da forma mais simples possível e me mostre o plano antes de executar.

### Requisitos

- **Modelos de briefing reutilizáveis.** Este é o primeiro de outros (onboarding de site institucional, landing page, e-commerce e sistema virão depois). A estrutura deve permitir cadastrar novos modelos sem mexer em código.
- **Seções** com título e descrição curta, em ordem.
- **Perguntas** com: texto, tipo de campo, opções (quando houver), dica interna (opcional), obrigatória sim/não, ordem.
- **Tipos de campo:** `short_text`, `long_text`, `select`, `multi_select`, `boolean`, `date`.
- **Trilhas condicionais:** a seção "Trilha Site" só aparece se `interesse_inicial` for site, landing page, e-commerce ou não sabe. A seção "Trilha Sistema" só aparece se for sistema ou não sabe. Se o sistema ainda não suportar condicionais, mostre todas as seções com a indicação "(pular se não se aplicar)".
- **Uso interno:** este modelo é preenchido pela Mayara durante a call. Não precisa de link público para o cliente.
- **Vínculo:** o briefing preenchido fica ligado ao cliente/lead.
- **Dica interna** aparece discreta abaixo da pergunta (texto menor, cor secundária). Não é enviada ao cliente.
- **Campos do Bloco 6** (status, temperatura, próximo passo) devem, se possível, atualizar o status do lead no pipeline. Se isso exigir muita mudança, deixe apenas como campos do briefing e me avise.

Use os `id` abaixo como chave estável de cada pergunta (útil para relatórios e para a automação de status).

---

## Modelo

- **Nome:** Diagnóstico (pré-venda)
- **Slug:** `diagnostico-pre-venda`
- **Descrição:** Roteiro da call de diagnóstico. Objetivo: entender o negócio, qualificar o lead e sair com o próximo passo marcado. Duração ideal: 30 a 40 minutos.
- **Visibilidade:** interno

---

## Seção 0 · Antes da call

Preencher ao agendar a call.

| id | Pergunta | Tipo | Opções | Obrigatória |
|---|---|---|---|---|
| `contato_nome` | Nome do contato | short_text | | sim |
| `empresa` | Empresa ou marca | short_text | | sim |
| `segmento` | Segmento | select | Saúde e bem-estar; Serviços; Comércio; Outro | sim |
| `origem` | Como chegou até mim | select | Indicação; Instagram; LinkedIn; Prospecção ativa; Outro | sim |
| `links_atuais` | Links do Instagram e do site atual | short_text | | não |
| `interesse_inicial` | Interesse inicial | select | Site institucional; Landing page; E-commerce; Sistema; Não sabe | sim |

---

## Seção 1 · Negócio

| id | Pergunta | Tipo | Opções | Obrigatória | Dica interna |
|---|---|---|---|---|---|
| `negocio_descricao` | Me conta o que você faz e há quanto tempo | long_text | | sim | |
| `cliente_ideal` | Quem é o seu cliente ideal? | long_text | | sim | |
| `canais_atuais` | Como seus clientes te encontram hoje? | long_text | | sim | |
| `ticket_medio` | Qual o valor médio de um cliente pra você? | short_text | | não | Usar depois para justificar o preço: "se trouxer 2 clientes, o projeto se paga". |

---

## Seção 2 · Motivação

| id | Pergunta | Tipo | Opções | Obrigatória | Dica interna |
|---|---|---|---|---|---|
| `por_que_agora` | Por que resolver isso agora? | long_text | | sim | Bloco que mais vende. Deixar a pessoa falar. |
| `custo_de_nao_agir` | O que acontece se continuar como está? | long_text | | sim | |
| `tentativas_anteriores` | Já tentou resolver antes? O que não funcionou? | long_text | | não | Revela expectativas e objeções. |

---

## Seção 3 · Trilha Site

Condição: `interesse_inicial` em [Site institucional, Landing page, E-commerce, Não sabe].

| id | Pergunta | Tipo | Opções | Obrigatória | Dica interna |
|---|---|---|---|---|---|
| `acao_principal` | O que a pessoa deve fazer ao entrar no site? | select | Chamar no WhatsApp; Agendar; Comprar; Pedir orçamento; Outro | sim | |
| `site_atual` | Já tem site? O que não gosta nele? | long_text | | não | |
| `material_pronto` | Tem logo, fotos e textos prontos? | select | Tudo; Parte; Nada | sim | "Nada" indica copy e fotos como serviço extra. |
| `dominio_hospedagem` | Tem domínio e hospedagem? | select | Os dois; Só domínio; Nenhum | sim | "Nenhum" é oportunidade de oferecer hospedagem na VPS. |
| `referencias` | Sites que você gosta, e por quê | long_text | | não | |

---

## Seção 4 · Trilha Sistema

Condição: `interesse_inicial` em [Sistema, Não sabe].

| id | Pergunta | Tipo | Opções | Obrigatória | Dica interna |
|---|---|---|---|---|---|
| `controle_atual` | Como você controla isso hoje? | multi_select | Planilha; WhatsApp; Papel; Outro app | sim | |
| `maior_dor` | Qual tarefa mais te toma tempo ou dá erro? | long_text | | sim | Essa é a funcionalidade central do MVP. |
| `usuarios` | Quantas pessoas vão usar? Quem são? | short_text | | sim | |
| `dados_sensiveis` | Vai guardar dados de saúde ou documentos de clientes? | boolean | | sim | Se sim: exigência maior de LGPD e segurança. Entra no preço. |
| `uso_mobile` | Precisa funcionar bem no celular? | boolean | | sim | |
| `integracoes` | Precisa conversar com algo? (pagamento, agenda, WhatsApp) | short_text | | não | Cada integração aumenta prazo e custo. |
| `criterio_sucesso` | Daqui a 3 meses, como você sabe que valeu a pena? | long_text | | sim | |

---

## Seção 5 · Decisão

| id | Pergunta | Tipo | Opções | Obrigatória | Dica interna |
|---|---|---|---|---|---|
| `decisores` | Além de você, alguém participa da decisão? | short_text | | sim | Se sim, tentar incluir a pessoa na apresentação da proposta. |
| `data_limite` | Tem data limite? | date | | não | |
| `motivo_data` | Por que essa data? | short_text | | não | |
| `faixa_investimento` | Qual investimento faz sentido pra você nesse projeto? | select | Até R$ 1.500; R$ 1.500 a R$ 3.000; R$ 3.000 a R$ 6.000; Acima de R$ 6.000; Não sabe | sim | Perguntar com naturalidade. Se "não sabe", apresentar a faixa do pacote e observar a reação. |
| `forma_pagamento` | Prefere PIX ou parcelar no cartão? | select | PIX; Cartão parcelado | não | |

---

## Seção 6 · Pós-call

Preenchido pela Mayara depois da call.

| id | Pergunta | Tipo | Opções | Obrigatória | Dica interna |
|---|---|---|---|---|---|
| `solucao_recomendada` | Solução recomendada | select | Site institucional; Landing page; E-commerce; Sistema; Combo | sim | |
| `temperatura` | Temperatura do lead | select | Quente; Morno; Frio | sim | |
| `objecoes` | Objeções que apareceram | long_text | | não | |
| `proximo_passo` | Próximo passo | short_text | | sim | Nunca encerrar a call sem próximo passo definido. |
| `data_proximo_passo` | Data do próximo passo | date | | sim | |
| `status` | Status | select | Proposta enviada; Aguardando retorno; Fechado; Perdido | sim | Atualiza o status do lead, se implementado. |
| `sinais_alerta` | Sinais de alerta | multi_select | Expectativa acima do orçamento; Não sabe quem decide; Quer começar sem sinal; Critica todos os profissionais anteriores; Nenhum | não | Um ou mais sinais: cobrar mais ou não fechar. |
