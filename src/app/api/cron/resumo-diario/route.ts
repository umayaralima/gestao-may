import { NextResponse, type NextRequest } from "next/server";
import { enviarResumoDiario } from "@/lib/enviar-resumo";
import { gerarDespesasRecorrentes } from "@/lib/recorrencias";

/*
 * Cron do resumo diário (vercel.json: todo dia às 10h UTC = 7h de Brasília).
 * A Vercel manda "Authorization: Bearer $CRON_SECRET"; sem o segredo configurado, recusa.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return NextResponse.json({ erro: "CRON_SECRET não configurado." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  // antes do resumo: lança as despesas recorrentes que venceram, pra entrarem no e-mail do dia
  const recorrentes = await gerarDespesasRecorrentes();
  const r = await enviarResumoDiario({ forcar: false });
  return NextResponse.json({ ...r, despesas_recorrentes: recorrentes }, { status: r.erro ? 500 : 200 });
}
