-- Assinatura eletrônica pelo Autentique. Rodar no SQL Editor depois da 010.

alter table public.contratos
  add column autentique_id    text,                                   -- id do documento no Autentique
  add column autentique_dados jsonb not null default '{}'::jsonb,     -- último retorno (signatários, links)
  add column atualizado_em    timestamptz not null default now();
create index contratos_autentique_id_idx on public.contratos (autentique_id);
