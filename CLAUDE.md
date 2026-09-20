# Sistema de Gestão para Autônomo(a), Web Design

Cole o bloco "Prompt inicial" direto no Claude Code. O resto do arquivo é a especificação que ele deve seguir durante a construção, pode deixar como `CLAUDE.md` na raiz do projeto pra ele consultar sempre.

---

## Prompt inicial

```
Quero construir um sistema web pra gerenciar minha rotina como freelancer de web design.
Centraliza clientes, projetos, briefing, contratos e pagamentos em um só lugar.

Stack: Next.js (App Router) + Supabase (banco + auth) + Tailwind.
Deploy: Vercel.

Sistema de uso único (só eu uso), sem multi-tenant, sem cadastro público.

Segue a especificação completa abaixo pra estrutura de dados, telas e regras de negócio.
Constrói a Fase 1 primeiro (ver seção "Fases"), completa e funcional, antes de
qualquer coisa da Fase 2.

Antes de começar, gera o schema do Supabase (SQL de criação das tabelas + RLS)
e me mostra pra eu rodar manualmente no painel do Supabase.
```

---

## Contexto

Freelancer de web design e design, atende clientes reais (sites institucionais,
landing pages, e-commerce). Precisa parar de controlar cliente por planilha e
WhatsApp espalhado, quer um lugar só pra ver em que pé está cada projeto, o que
falta cobrar e o que falta assinar.

## Stack técnica

- Next.js 14+ (App Router), TypeScript
- Supabase (Postgres + Auth + Storage se precisar anexar arquivo de briefing)
- Tailwind CSS
- Deploy na Vercel

Motivo da escolha: mesma stack do sistema fitness que já está construindo pro
seu marido. Reaproveita padrão de auth, deploy e o que já aprendeu de Supabase
em vez de estrear stack nova num sistema pra uso próprio.

## Autenticação

Uso único, uma pessoa só. Não precisa de sistema de cadastro nem convite.

- Supabase Auth, login por e-mail/senha (ou magic link)
- Só um usuário permitido: restringe por e-mail direto no código ou cria manualmente
  o usuário no painel do Supabase e desativa signup público
- RLS em todas as tabelas: só libera leitura/escrita pra usuário autenticado
  (`auth.uid() is not null`), já que é o único usuário do sistema

## Modelagem de dados

```sql
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text,
  nicho text,
  email text,
  whatsapp text,
  origem text, -- indicação, instagram, site, etc.
  status text default 'ativo', -- ativo, inativo
  observacoes text,
  criado_em timestamptz default now()
);

create table projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  nome text not null,
  tipo text, -- site institucional, landing page, e-commerce, sistema, outro
  status text default 'briefing',
  -- valores possíveis: briefing, orcamento_enviado, aprovado,
  -- em_desenvolvimento, em_revisao, entregue, concluido, cancelado
  valor_total numeric,
  data_inicio date,
  prazo_entrega date,
  link_projeto text, -- staging, repositório, o que fizer sentido
  observacoes text,
  criado_em timestamptz default now()
);

create table briefings (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  objetivo text,
  publico_alvo text,
  referencias text, -- links de referência visual
  tem_identidade_visual boolean default false,
  cores_preferidas text,
  conteudo_disponivel boolean default false, -- já tem texto/imagem pronto?
  funcionalidades text, -- blog, loja, formulário, área de membro, etc.
  concorrentes text,
  orcamento_aproximado numeric,
  respostas_extra jsonb, -- perguntas customizadas por tipo de projeto
  criado_em timestamptz default now()
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  status text default 'rascunho', -- rascunho, enviado, assinado
  link_documento text, -- link do Autentique ou similar
  data_envio date,
  data_assinatura date,
  criado_em timestamptz default now()
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  tipo text, -- entrada, parcela, pagamento_unico, final
  valor numeric not null,
  vencimento date not null,
  status text default 'pendente', -- pendente, pago, atrasado
  forma_pagamento text, -- pix, boleto, cartão, etc.
  data_pagamento date,
  criado_em timestamptz default now()
);
```

Regra pro campo `status` de `pagamentos`: não precisa de cron job. Calcula
"atrasado" em tempo real na query (`vencimento < hoje and data_pagamento is null`)
em vez de guardar um status que pode ficar desatualizado.

## Telas / Funcionalidades

### Dashboard (home)
Cards de resumo, sem gráfico complicado, só números que importam pra decisão do dia:
- Projetos ativos (status entre orçamento_enviado e em_revisao)
- Valor a receber no mês (soma de pagamentos com vencimento no mês, não pagos)
- Pagamentos atrasados (contagem + valor total)
- Contratos aguardando assinatura
- Lista dos próximos 5 vencimentos (projeto, cliente, valor, data)

### Clientes
- Lista com busca por nome/empresa
- Cadastro e edição
- Ao abrir um cliente, mostra todos os projetos dele

### Projetos
- Lista com filtro por status
- Cada projeto abre numa página com abas: Visão geral, Briefing, Contrato, Pagamentos
- Trocar o status do projeto é uma ação direta na página (dropdown ou botões),
  não escondida em formulário de edição

### Briefing
- Formulário estruturado (campos da tabela `briefings`)
- Um briefing por projeto

### Contratos
- Status do contrato + link pro documento externo (Autentique, Google Docs, etc.)
- Marcar como enviado/assinado com data automática do dia

### Pagamentos
- Lista de parcelas do projeto, pode ter mais de uma
- Marcar como pago registra a data automaticamente
- Indicador visual claro pra atrasado (não só uma cor discreta, tem que saltar aos olhos)

## Regras de negócio

- Status do projeto é manual, o sistema não muda sozinho, mas pode sugerir:
  quando contrato vira "assinado", sugere (não força) mudar projeto pra "aprovado"
- Projeto sem cliente não existe, `cliente_id` é obrigatório
- Pagamento sem projeto não existe, `projeto_id` é obrigatório
- Não deixa cadastrar pagamento com vencimento antes da data de início do projeto,
  validação simples de sanidade

## Fora de escopo na v1

Não constrói isso agora, é armadilha clássica de tentar entregar tudo de uma vez:
- Envio automático de cobrança (WhatsApp/e-mail)
- Assinatura de contrato integrada (fica o link externo por enquanto)
- Geração automática de nota fiscal
- Portal do cliente (cliente ver o próprio projeto)
- Multi-usuário

## Fases sugeridas

**Fase 1** (construir primeiro, sistema já útil sozinho):
Clientes, Projetos, Pagamentos, Dashboard. Sem briefing estruturado ainda,
usa campo de observação livre no projeto.

**Fase 2**:
Briefing estruturado, Contratos.

**Fase 3** (só depois de usar o sistema por um tempo e sentir falta):
Integração com InfinitePay pra gerar link de cobrança direto do pagamento
cadastrado, integração com Autentique pra criar o contrato sem sair do sistema.

## Padrões de código

Se quiser manter consistência com o sistema fitness que está construindo pro
seu marido: mesma estrutura de pastas, mesmo padrão de client Supabase
(`lib/supabase/client.ts` e `server.ts`), mesmo padrão de componentes de
formulário. Cola aqui o `CLAUDE.md` daquele projeto se quiser que o Claude Code
siga o mesmo estilo.

---

## Decisões tomadas na construção (2026-09-18)

- Projeto vive em `C:/Users/maahl/Documents/May/gestao` (movido do HD externo em 2026-09-19). Next 16 (App Router, `src/`), Tailwind 4, Supabase via `@supabase/ssr`.
- Schema em `supabase/schema.sql`. `pagamentos` NÃO tem coluna `status`: vem da view `pagamentos_view`
  (`pago` se `data_pagamento`, `atrasado` se `vencimento < hoje`, senão `pendente`).
- Auth: e-mail/senha, único usuário. `ALLOWED_EMAIL` no `.env.local` trava o login; signup público desligado no painel.
- Design System: tokens do guia "May" (Figma Starter File - Mayara) em `src/app/globals.css` como CSS vars + `@theme` do Tailwind.
  Paleta `rosa-*`, `lavanda-*`, `neutro-*`, estados `sucesso/alerta/falha/info`. Radius 4/8/24. Fontes: DM Serif Display
  (títulos, itálico, peso 400) e Plus Jakarta Sans (texto), via `next/font`. Escala de tamanho reduzida pra UI de gestão.
- Componentes de UI em `src/components/ui/` seguem o Botão do guia (primário gradiente rosa-600→400, hover rosa-700, active rosa-900;
  secundário borda rosa-600; terciário link sublinhado) e o Input (borda 2px neutro-100, foco neutro-800).
- Mutations via Server Actions em `src/app/(app)/<modulo>/actions.ts`, validação com zod, `revalidatePath` depois.
- Datas: sempre `date` (string `YYYY-MM-DD`) no banco; formatação pt-BR no `src/lib/format.ts`. Moeda BRL.

## Fase 2 + ajustes (2026-09-19)

- Tipos de projeto NÃO são lista fixa: tabela `tipos_projeto` (nome único, ordem), editável em `/configuracoes`.
  `projetos.tipo` guarda o nome em texto; renomear um tipo propaga pros projetos. Seeds: Landing Page, Página de Vendas,
  E-commerce, Institucional, Página de Links, Blog. Migração pra bancos já criados: `supabase/migrations/002_tipos_projeto.sql`.
- Briefing: aba no projeto, upsert em `briefings` (unique projeto_id). `respostas_extra` (jsonb) sem UI por enquanto.
- Contratos: aba no projeto, vários por projeto, linha do tempo rascunho → enviado → assinado; marcar registra a data do dia.
  Contrato assinado + projeto em briefing/orcamento_enviado mostra banner sugerindo "Aprovado" (não força).
- Server actions específicas de aba ficam em `src/app/(app)/projetos/[id]/<aba>/actions.ts`.

## CRM integrado (escopo adicionado e construído em 2026-09-19, refinar após uso)

O sistema também é o CRM da May: acompanha o lead desde o primeiro contato até virar cliente,
no mesmo lugar dos projetos e pagamentos. Não é um CRM genérico de equipe de vendas: é pra uma
pessoa saber com quem falar hoje e não deixar proposta esfriar.

**Escopo do MVP (aprovado pela May, construído):**

- **Leads** separados de clientes: nome, contato (WhatsApp/e-mail/Instagram), origem, serviço de interesse
  (usa `tipos_projeto`), valor estimado, observações.
- **Funil (pipeline)** com etapas fixas e manuais: `novo` → `em_contato` → `proposta_enviada` → `negociando`
  → `ganho` | `perdido` (com motivo da perda). Visualização em colunas (kanban simples) e em lista.
- **Próximo follow-up**: data + nota por lead. Dashboard ganha card "Follow-ups de hoje/atrasados" e a
  lista de leads destaca os vencidos, no mesmo padrão visual de pagamento atrasado.
- **Histórico de interações** por lead: registro manual (data, canal, resumo). Sem integração com WhatsApp.
- **Converter lead em cliente**: ao marcar `ganho`, cria o cliente (e opcionalmente o projeto) já preenchidos
  com os dados do lead, mantendo o vínculo `cliente.lead_id` pra rastrear origem.
- Cliente existente também pode receber interações e follow-up (pós-venda, upsell), então a tabela de
  interações referencia lead **ou** cliente.

**Fora de escopo do CRM na v1:** disparo de mensagens, captura automática de lead de formulário/Instagram,
automações de e-mail, metas e relatórios de conversão, múltiplos vendedores.

**Ordem sugerida:** construir depois da Fase 2 estar em uso, antes da Fase 3 (integrações), porque não
depende de serviço externo e resolve dor diária (proposta esquecida).

**Como ficou implementado:**
- Tabelas `leads` e `interacoes` (interação referencia lead OU cliente); `clientes` ganhou `lead_id`, `proximo_followup`,
  `nota_followup`. Migração: `supabase/migrations/003_crm.sql`.
- `/leads`: funil em 4 colunas (novo, em_contato, proposta_enviada, negociando) + "Fechados" recolhido; `?ver=lista` e
  `?filtro=followup` (só follow-ups de hoje/atrasados). Card com follow-up atrasado ganha anel vermelho.
- `/leads/[id]`: dropdown de etapa inline (`SelectInline`), motivo da perda quando `perdido`, botão "Converter em cliente"
  (cria cliente com `lead_id`, marca `ganho`, redireciona pra `/projetos/novo?cliente=&servico=&valor=` pré-preenchido).
- `PainelRelacionamento` (`src/app/(app)/crm/`) é compartilhado entre lead e cliente: follow-up (feito / adiar 1 dia / 1 semana /
  reagendar) + timeline de interações. Ações genéricas recebem `Dono = { tipo: "lead" | "cliente", id }`.
- Única automação: registrar interação num lead `novo` move pra `em_contato` (reversível no dropdown).
- Dashboard: card "Follow-ups" (leads abertos + clientes com `proximo_followup <= hoje`), vermelho se > 0.

## Visual (2026-09-19): tema escuro do wireframe do Figma

- Referência: Figma `Starter File - Mayara`, node `4037:1230` ("Dashboard Wireframe Design"). É um template adaptado; trouxemos
  o layout e o clima, NÃO os itens de menu de template (E-mails, Relatórios, Tarefas) nem as cores de template (índigo `#7c86ff`,
  cinza `#6b7699`). Paleta é só a da marca (decisão da May).
- Tokens semânticos em `globals.css`: `--fundo` (lavanda-900), `--superficie` (lavanda-700), `--superficie-2` (lavanda-600),
  `--borda` (lavanda-400 a 55%), `--texto` (lavanda-50), `--texto-suave` (lavanda-100), `--texto-mudo`/`--texto-rotulo` (lavanda-200).
  No Tailwind: `bg-fundo`, `bg-superficie`, `border-borda`, `text-texto`, `text-texto-mudo` etc. Classe utilitária `.rotulo`
  (10px, caixa alta, tracking 1px) pra seções do menu, cabeçalhos de tabela e cards de métrica.
- Cards: radius 12px, borda fina, sem sombra. Inputs/botões: radius 8px. Botão primário rosa-600 sólido (não gradiente) no escuro.
- Estados no escuro usam tons claros pra legibilidade: sucesso `#5fe07a`, alerta `#ffc266`, falha `#ff8a8a` (texto); fundos com
  os tokens `sucesso/alerta/falha` em alpha. Atrasado continua `bg-falha` sólido com texto branco.
- Fontes: DM Serif Display itálico só nos títulos de página (h1); títulos de card em sans semibold; números de métrica em
  JetBrains Mono (`font-mono`), como no wireframe.
- Marca: `public/marca/` (logos e favicons enviados pela May, PNG transparente). `src/app/icon.png` e `apple-icon.png` são o
  favicon gradiente recortado (o PNG original tem sombra longa). O PNG `logo-gradiente.png` já traz "Desenvolvedora Web".
- Ícones do menu: `lucide-react`.

## Front-end final: transplante do protótipo do Figma Make (2026-09-19)

- Fonte da verdade visual: código exportado do Figma Make em `C:/Users/maahl/Documents/May/figma-make/src/`
  (App.tsx, Clients.tsx, Pipeline.tsx, Tasks.tsx, Financeiro.tsx, Reports.tsx, index.css). Link do protótipo:
  https://www.figma.com/make/TOOCF1MSmSFMaME432CI3p/Dashboard-Wireframe-Design. A May é designer e exigente com o front:
  ao mexer em tela, copiar classes/estrutura de lá, não inventar.
- Nomes das telas iguais ao Figma: Dashboard, Clientes, Pipeline (leads), Tarefas, Financeiro (pagamentos), E-mails e
  Integrações (em breve, desabilitados), Configurações. Projetos é o único acréscimo (briefing e contratos vivem lá).
- Etapas do Pipeline com os nomes do protótipo: Prospecção, Qualificação, Proposta, Negociação, Fechado (+ Perdido fora do kanban).
  Valores no banco continuam novo/em_contato/proposta_enviada/negociando/ganho/perdido.
- Regras da May pro protótipo: (1) animação de entrada nas telas: recharts anima os gráficos ao montar + classe `.entrar`
  (fade/slide 350ms) nos blocos; (2) filtros no topo de cada seção são o menu hambúrguer `FiltroMenu` (escreve na URL),
  nunca fileira de botões; (3) Tarefas tem Dia (agrupado como o Make) / Semana (7 colunas) / Mês (calendário).
- Primitivos em `src/components/ui/primitivos.tsx` (Header, Subbar, Card, KpiCard, Pill, Avatar, Busca, Th/Td/Tr, campos),
  `modal.tsx` (Modal, Escolha), `filtro-menu.tsx`, `select-inline.tsx`. Cores literais (#231431, #311C45, #968F88…) são
  propositais: batem 1:1 com o export do Make. Aliases `brand-*`/`dark-*`/`warm-*` no `globals.css` apontam pros tokens do guia.
- Layout: `flex h-screen`, sidebar 224px, `main` sem scroll; cada tela é `flex flex-col h-full` com Header fixo e conteúdo rolável.
- Formulários de criação/edição são modais (padrão NewTaskModal). `?novo=1` / `?nova=1` na URL abre o modal (usado pelos atalhos).
- Tarefas: tabela `tarefas` + `leads.prioridade` na migração `004_tarefas_prioridade.sql`. `supabase/RODAR-AGORA.sql` = 002+003+seed+004.
- `Reports.tsx` (Relatórios) do Make ainda não foi transplantado: candidato pra Fase 3 junto com "Ver NF"/exportar CSV.

## Estado em 2026-09-20 (handoff)

- Tudo conferido no navegador com dados fictícios: Dashboard, Clientes (+ painel lateral), Pipeline, Tarefas (dia/semana/mês),
  Financeiro, Projetos (abas). Build de produção passa.
- Banco Supabase (projeto cpetvyyqlufuloelojgd): schema.sql + migrações 002, 003, 004 + seed já rodados. May já cadastrou
  um cliente real (BuilDesk) no meio dos fictícios; ao limpar o seed, preservar o que não tem id `a0…/b0…/c0…`.
- GitHub: https://github.com/umayaralima/gestao-may (main). Vercel: deploy sendo configurado pela May
  (preset Next.js, root vazio, 3 env vars). Depois do deploy: Supabase → Authentication → URL Configuration → Site URL.
- Próximos passos combinados: (1) May usa o sistema publicado e manda acertos visuais em lote; (2) Relatórios a partir de
  `figma-make/src/Reports.tsx`; (3) limpar dados fictícios; (4) Fase 3 (InfinitePay, Autentique).

## Responsividade + Configurações (2026-09-20)

- Responsivo: `src/components/app-shell.tsx` (sidebar vira gaveta abaixo de `lg`, barra superior com hambúrguer). Header/Subbar
  quebram linha; KPIs `grid-cols-2 xl:grid-cols-4`; blocos de 3 colunas `lg:grid-cols-3`; tabelas em `overflow-auto` com `min-w`;
  painel lateral de Clientes vira overlay no celular. `FiltroMenu` renderiza por portal (`position: fixed`), imune a `overflow`.
- Configurações (Make `Configuracoes.tsx`, colado pela May no chat; ver `figma-make/src/Configuracoes.tsx.md`): nav lateral de abas
  Perfil / Empresa / Pipeline / Financeiro / Serviços / Segurança em `src/app/(app)/configuracoes/configuracoes.tsx`.
  Adaptado pro uso único: sem Notificações (entra junto com a integração de E-mails/Gmail na Fase 3), Segurança só troca de senha
  (confere a atual via `signInWithPassword`), sem 2FA/sessões/excluir conta. Etapas do pipeline continuam fixas (só leitura).
- Tabela `configuracoes` (linha única, id=1) na migração `005_configuracoes.sql`; leitura por `getConfiguracoes()` em
  `src/lib/configuracoes.ts` (cai nos padrões se a migração não rodou). Onde cada campo age: `nome`/`titulo` → rodapé da sidebar;
  `meta_mensal` → barra no card "Receita do mês" do Dashboard; `dias_negocio_parado` → ⚠ no card do Pipeline;
  `dias_aviso_vencimento` → pílula "Vence em Nd" no Financeiro; `forma_pagamento_preferida` → padrão dos modais de lançamento/pago.
- `cn()` não usa tailwind-merge: pra sobrescrever largura de um primitivo, passe prop (ex.: `largura=` no Input de Configurações).
