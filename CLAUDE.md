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

- Projeto vive em `01 - May Lima/gestao`. Next 16 (App Router, `src/`), Tailwind 4, Supabase via `@supabase/ssr`.
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
