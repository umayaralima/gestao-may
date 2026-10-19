import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Renova a sessão a cada request e protege as rotas do app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims valida o JWT localmente quando o projeto usa chaves assimétricas: uma ida
  // à rede a menos por navegação. Só cai no getUser se não vierem claims.
  let logado = false;
  try {
    const { data } = await supabase.auth.getClaims();
    logado = !!(data?.claims as { sub?: string } | undefined)?.sub;
  } catch {
    logado = false;
  }
  if (!logado) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    logado = !!user;
  }

  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!logado && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (logado && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
