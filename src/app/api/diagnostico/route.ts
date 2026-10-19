import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Diagnóstico de velocidade: mede, de dentro da função, quanto custa falar com o Supabase.
 * Serve pra separar "função lenta" de "banco longe". Protegido pelo mesmo token da API de leads.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ erro: "Token ausente." }, { status: 401 });

  const inicio = Date.now();
  const supabase = createAdminClient();

  const { data: config, error } = await supabase.from("configuracoes").select("id").eq("leads_token", token).maybeSingle<{ id: number }>();
  const msAutenticacao = Date.now() - inicio;
  if (error || !config) return NextResponse.json({ erro: "Token não reconhecido." }, { status: 401 });

  // 3 consultas simples em sequência: mostra o custo de ida e volta até o banco
  const tempos: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t = Date.now();
    await supabase.from("configuracoes").select("id").eq("id", 1).maybeSingle();
    tempos.push(Date.now() - t);
  }

  // consulta mais pesada (joins), como as telas fazem
  const tPesada = Date.now();
  await supabase.from("pagamentos_view").select("*, projetos(nome, clientes(nome))").limit(20);
  const msConsultaPesada = Date.now() - tPesada;

  const media = Math.round(tempos.reduce((s, n) => s + n, 0) / tempos.length);

  return NextResponse.json({
    regiao_funcao: process.env.VERCEL_REGION ?? "desconhecida",
    url_banco: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "").split(".")[0],
    ms_primeira_consulta: msAutenticacao,
    ms_consultas_simples: tempos,
    ms_media_por_consulta: media,
    ms_consulta_com_joins: msConsultaPesada,
    diagnostico:
      media > 120
        ? "Banco distante da função: cada ida e volta custa caro. Alinhar as regiões resolve."
        : media > 50
          ? "Latência aceitável; a lentidão deve estar no número de consultas por tela."
          : "Banco perto da função. A lentidão não vem daqui.",
  });
}
