import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// "p/" é a proposta pública e "b/" o briefing do cliente (ambos sem login);
// "api" tem autenticação própria.
export const config = {
  matcher: ["/((?!api|p/|b/|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
