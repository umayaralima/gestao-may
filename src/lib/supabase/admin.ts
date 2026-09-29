import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/*
 * Cliente de serviço, só pra rotas que rodam SEM sessão de usuário (cron do resumo diário,
 * feed iCal da agenda). Usa SUPABASE_SERVICE_ROLE_KEY, que existe apenas como variável de
 * ambiente do servidor na Vercel: nunca prefixada com NEXT_PUBLIC_, nunca commitada.
 * Em todo o resto do app continua valendo o cliente com a chave publishable + RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
