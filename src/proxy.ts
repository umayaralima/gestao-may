import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// "p/" é a proposta pública, "b/" o briefing do cliente e "c/" o portal do
// cliente (todos sem login, o token é a credencial);
// "api" tem autenticação própria.
export const config = {
  matcher: ["/((?!api|p/|b/|c/|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
