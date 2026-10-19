-- Respostas extras do formulário do site (segmento, prazo desejado, faixa de investimento,
-- melhor horário…). Guardadas como pergunta → resposta, pra aceitar qualquer campo novo
-- sem precisar mexer no sistema. Rodar no SQL Editor depois da 014.

alter table public.leads add column respostas jsonb not null default '{}'::jsonb;
