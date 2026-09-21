-- =========================================================
-- Remove os dados fictícios do seed, preservando tudo que a May cadastrou (BuilDesk etc.).
-- Critério: o seed usa ids fixos a0…(leads), b0…(projetos), c0…(clientes). Tudo que não
-- tem esse prefixo fica. Rodar no SQL Editor, uma vez. Não mexe em configuracoes,
-- tipos_projeto, categorias_tarefa nem etapas_modelo.
-- =========================================================

begin;

-- 1) Tarefas do seed: as ligadas a lead/cliente/projeto fictício (o FK é "set null", então
--    precisam sair antes dos pais, senão viram tarefas órfãs).
delete from public.tarefas
 where lead_id::text    like 'a0000000-%'
    or cliente_id::text like 'c0000000-%'
    or projeto_id::text like 'b0000000-%';

-- 2) Projetos fictícios (cascata: pagamentos, briefings, contratos)
delete from public.projetos where id::text like 'b0000000-%';

-- 3) Clientes fictícios (cascata: interações)
delete from public.clientes where id::text like 'c0000000-%';

-- 4) Leads fictícios (cascata: interações; clientes.lead_id vira null)
delete from public.leads where id::text like 'a0000000-%';

commit;

-- Conferência: o que sobrou
select 'leads' as tabela, count(*) from public.leads
union all select 'clientes',   count(*) from public.clientes
union all select 'projetos',   count(*) from public.projetos
union all select 'pagamentos', count(*) from public.pagamentos
union all select 'contratos',  count(*) from public.contratos
union all select 'briefings',  count(*) from public.briefings
union all select 'interacoes', count(*) from public.interacoes
union all select 'tarefas',    count(*) from public.tarefas;
