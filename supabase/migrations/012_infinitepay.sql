-- Link de cobrança da InfinitePay. Rodar no SQL Editor depois da 011.

alter table public.configuracoes
  add column infinitepay_handle text;   -- seu InfiniteTag, sem o $

alter table public.pagamentos
  add column link_pagamento  text,      -- URL do checkout
  add column link_slug       text,      -- invoice_slug devolvido pela InfinitePay
  add column link_criado_em  timestamptz,
  add column transaction_nsu text,      -- id da transação aprovada
  add column recibo_url      text;      -- comprovante da InfinitePay

create index pagamentos_link_slug_idx on public.pagamentos (link_slug);
