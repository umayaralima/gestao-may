import { createClient } from "@/lib/supabase/server";
import type { Configuracoes } from "@/lib/types";

/** Padrões usados enquanto a migração 005 não rodou ou o campo está vazio. */
export const CONFIG_PADRAO: Configuracoes = {
  id: 1,
  nome: "Mayara Lima",
  titulo: "Desenvolvedora Web",
  email_contato: null,
  telefone: null,
  empresa: null,
  cnpj: null,
  site: null,
  meta_mensal: null,
  dias_aviso_vencimento: 3,
  dias_negocio_parado: 10,
  forma_pagamento_preferida: "pix",
  chave_pix: null,
  atualizado_em: "",
};

/** Linha única de `configuracoes` (server). Nunca falha: cai nos padrões. */
export async function getConfiguracoes(): Promise<Configuracoes> {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracoes").select("*").eq("id", 1).maybeSingle<Configuracoes>();
  return { ...CONFIG_PADRAO, ...(data ?? {}) };
}
