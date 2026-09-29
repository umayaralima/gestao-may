-- Resumo diário por e-mail + feed de agenda (iCal). Rodar no SQL Editor depois da 008.

alter table public.configuracoes
  add column resumo_diario   boolean not null default true,   -- enviar o resumo das 7h
  add column resumo_email    text,                            -- destino (vazio = email_contato)
  add column agenda_token    uuid not null default gen_random_uuid(); -- link secreto do calendário

-- Log dos envios: evita mandar duas vezes no mesmo dia e serve de histórico
create table public.envios_resumo (
  id        uuid primary key default gen_random_uuid(),
  dia       date not null unique,
  destino   text not null,
  itens     int  not null default 0,
  erro      text,
  criado_em timestamptz not null default now()
);
alter table public.envios_resumo enable row level security;
create policy "auth_all" on public.envios_resumo for all to authenticated using (true) with check (true);
