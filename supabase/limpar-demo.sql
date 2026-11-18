-- =====================================================================
-- LIMPA O SEED DE DEMONSTRAÇÃO (seed-demo.sql).
-- Apaga SÓ o que tem id começando com 'dddddddd-'. Nada de dado real é tocado.
-- Rode na ordem: os filhos primeiro, pra não depender de cascade.
-- =====================================================================

delete from public.interacoes where id::text like 'dddddddd-%';
delete from public.tarefas    where id::text like 'dddddddd-%';
delete from public.despesas   where id::text like 'dddddddd-%';
delete from public.propostas  where id::text like 'dddddddd-%';
delete from public.contratos  where id::text like 'dddddddd-%';
delete from public.pagamentos where id::text like 'dddddddd-%';
delete from public.briefings  where id::text like 'dddddddd-%' or projeto_id::text like 'dddddddd-%';
delete from public.projetos   where id::text like 'dddddddd-%';
delete from public.clientes   where id::text like 'dddddddd-%';
delete from public.leads      where id::text like 'dddddddd-%';

-- conferência: tem que voltar tudo zero
select 'clientes' as tabela, count(*) from public.clientes where id::text like 'dddddddd-%'
union all select 'projetos',   count(*) from public.projetos   where id::text like 'dddddddd-%'
union all select 'leads',      count(*) from public.leads      where id::text like 'dddddddd-%'
union all select 'propostas',  count(*) from public.propostas  where id::text like 'dddddddd-%'
union all select 'contratos',  count(*) from public.contratos  where id::text like 'dddddddd-%'
union all select 'pagamentos', count(*) from public.pagamentos where id::text like 'dddddddd-%'
union all select 'despesas',   count(*) from public.despesas   where id::text like 'dddddddd-%'
union all select 'tarefas',    count(*) from public.tarefas    where id::text like 'dddddddd-%'
union all select 'interacoes', count(*) from public.interacoes where id::text like 'dddddddd-%';
