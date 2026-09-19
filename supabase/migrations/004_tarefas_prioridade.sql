-- Tarefas (tela do Figma) + prioridade nos leads (cards do Pipeline).
-- Rodar no SQL Editor depois da 003.

alter table public.leads add column prioridade text not null default 'media'
  check (prioridade in ('alta', 'media', 'baixa'));

create table public.tarefas (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descricao    text,
  cliente_id   uuid references public.clientes(id) on delete set null,
  lead_id      uuid references public.leads(id) on delete set null,
  categoria    text not null default 'outro'
               check (categoria in ('ligacao', 'email', 'reuniao', 'proposta', 'follow_up', 'contrato', 'outro')),
  prioridade   text not null default 'media'
               check (prioridade in ('alta', 'media', 'baixa')),
  vencimento   date,
  concluida_em timestamptz,
  criado_em    timestamptz not null default now()
);
create index tarefas_vencimento_idx on public.tarefas (vencimento);
create index tarefas_cliente_id_idx on public.tarefas (cliente_id);

alter table public.tarefas enable row level security;
create policy "auth_all" on public.tarefas for all to authenticated using (true) with check (true);

-- Tarefas de exemplo (só se o seed já rodou; senão ignore os erros de FK)
insert into public.tarefas (titulo, descricao, cliente_id, lead_id, categoria, prioridade, vencimento) values
  ('Ligar pra Fernanda sobre proposta', 'Apresentar os 3 pacotes e tirar dúvidas do agendamento online.', null, 'a0000000-0000-0000-0000-000000000003', 'ligacao', 'alta', current_date),
  ('Enviar layout final pra Aline', 'Home + página de receita. Pedir aprovação até sexta.', 'c0000000-0000-0000-0000-000000000004', null, 'email', 'alta', current_date),
  ('Reunião de fechamento — Ribeiro Advocacia', 'Escopo final e forma de pagamento em 4x.', null, 'a0000000-0000-0000-0000-000000000006', 'reuniao', 'alta', current_date + 1),
  ('Follow-up Patrícia (curso de confeitaria)', null, null, 'a0000000-0000-0000-0000-000000000005', 'follow_up', 'media', current_date + 1),
  ('Cobrar parcela atrasada — Prado Arquitetura', 'Boleto venceu há 6 dias. Mandar 2ª via.', 'c0000000-0000-0000-0000-000000000002', null, 'follow_up', 'alta', current_date + 2),
  ('Montar proposta TN Suplementos', 'Loja com ~80 produtos, Melhor Envio + Pix.', null, 'a0000000-0000-0000-0000-000000000004', 'proposta', 'media', current_date + 3),
  ('Enviar contrato — PH Móveis', 'Catálogo online. Autentique.', 'c0000000-0000-0000-0000-000000000005', null, 'contrato', 'media', current_date + 4),
  ('Galeria newborn — subir fotos da Luana', null, 'c0000000-0000-0000-0000-000000000001', null, 'outro', 'baixa', current_date + 8),
  ('Renovação de manutenção — Prado', 'Perguntar se quer renovar o plano anual.', 'c0000000-0000-0000-0000-000000000002', null, 'ligacao', 'baixa', current_date + 12);

update public.tarefas set concluida_em = now() - interval '2 days' where titulo = 'Galeria newborn — subir fotos da Luana';
insert into public.tarefas (titulo, cliente_id, categoria, prioridade, vencimento, concluida_em) values
  ('Entregar LP de matrícula — Carvalho Fit', 'c0000000-0000-0000-0000-000000000003', 'outro', 'alta', current_date - 10, now() - interval '10 days'),
  ('Kick-off site + receitas — Aline', 'c0000000-0000-0000-0000-000000000004', 'reuniao', 'media', current_date - 5, now() - interval '5 days');

update public.leads set prioridade = 'alta'  where id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000006');
update public.leads set prioridade = 'baixa' where id in ('a0000000-0000-0000-0000-000000000002');
