-- Cadastro completo do cliente (pós-fechamento): dados pra contrato, redes e acessos.
-- Rodar no SQL Editor depois da 006.

alter table public.clientes
  add column documento         text,   -- CPF ou CNPJ (entra no contrato)
  add column endereco          text,   -- endereço completo (entra no contrato)
  add column instagram         text,   -- @perfil
  add column site              text,   -- site atual, se tiver
  add column contato_preferido text check (contato_preferido in ('whatsapp', 'email', 'instagram')),
  add column acessos           text;   -- hospedagem, domínio, Drive, links úteis (texto livre)
