/*
 * Roda uma vez por instância do servidor (Next instrumentation).
 *
 * Mantém as conexões HTTPS abertas entre as consultas: sem isso cada chamada ao Supabase
 * paga DNS + TCP + TLS de novo (~60ms do total de 89ms medido no /api/diagnostico).
 * Vale pro Supabase e também pro Resend, Autentique e InfinitePay.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { Agent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: 60_000, // mantém a conexão viva por 1 min de ociosidade
      keepAliveMaxTimeout: 10 * 60_000,
      connections: 32, // pool por host
      pipelining: 1,
    }),
  );
}
