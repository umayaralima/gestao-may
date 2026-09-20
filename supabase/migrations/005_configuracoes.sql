-- Configurações do sistema (tela Configurações do Figma Make): uma linha só, id fixo = 1.
-- Rodar no SQL Editor depois da 004.

create table public.configuracoes (
  id                        int primary key default 1 check (id = 1),
  nome                      text,
  titulo                    text,            -- "Desenvolvedora Web"
  email_contato             text,
  telefone                  text,
  empresa                   text,
  cnpj                      text,
  site                      text,
  meta_mensal               numeric,         -- meta de receita do mês (Dashboard)
  dias_aviso_vencimento     int not null default 3,   -- "vence em N dias" no Financeiro
  dias_negocio_parado       int not null default 10,  -- alerta ⚠ no card do Pipeline
  forma_pagamento_preferida text not null default 'pix'
                            check (forma_pagamento_preferida in ('pix', 'boleto', 'cartao', 'transferencia', 'outro')),
  chave_pix                 text,
  atualizado_em             timestamptz not null default now()
);

alter table public.configuracoes enable row level security;
create policy "auth_all" on public.configuracoes for all to authenticated using (true) with check (true);

insert into public.configuracoes (id, nome, titulo, email_contato) values (1, 'Mayara Lima', 'Desenvolvedora Web', 'maaysabrinalima@gmail.com');
