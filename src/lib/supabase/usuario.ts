import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/*
 * Usuário da sessão, em cache por request. Usa `getClaims()`, que valida o JWT localmente
 * quando o projeto tem chaves assimétricas — evita uma ida à rede por página. Cai em
 * `getUser()` se os claims não vierem.
 */
export const usuarioAtual = cache(async function usuarioAtual(): Promise<{ id: string; email: string | null } | null> {
  const supabase = await createClient();

  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as { sub?: string; email?: string } | undefined;
    if (claims?.sub) return { id: claims.sub, email: claims.email ?? null };
  } catch {
    // segue pro getUser
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
});
