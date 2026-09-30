import { NextResponse, type NextRequest } from "next/server";
import { conferirPagamento } from "@/lib/infinitepay";
import { createAdminClient } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/format";

/*
 * Webhook da InfinitePay. A API não assina a chamada, então aqui há duas barreiras:
 * 1) segredo na própria URL (?s=), e 2) confirmação em payment_check antes de dar baixa.
 * Nunca marcamos pago só com o que chega no corpo do POST.
 */

type Payload = {
  order_nsu?: string;
  transaction_nsu?: string;
  invoice_slug?: string;
  paid_amount?: number;
  amount?: number;
  receipt_url?: string;
  installments?: number;
};

export async function POST(request: NextRequest) {
  const segredo = process.env.INFINITEPAY_WEBHOOK_SECRET;
  if (segredo && request.nextUrl.searchParams.get("s") !== segredo) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: Payload;
  try {
    corpo = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const orderNsu = corpo.order_nsu;
  if (!orderNsu) return NextResponse.json({ ignorado: "sem order_nsu" });

  const supabase = createAdminClient();
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, projeto_id, valor, data_pagamento, link_slug")
    .eq("id", orderNsu)
    .maybeSingle<{ id: string; projeto_id: string; valor: number; data_pagamento: string | null; link_slug: string | null }>();
  if (!pagamento) return NextResponse.json({ ignorado: "cobrança não é de nenhuma parcela" });
  if (pagamento.data_pagamento) return NextResponse.json({ ok: true, ja: "parcela já estava paga" });

  const { data: config } = await supabase.from("configuracoes").select("infinitepay_handle").eq("id", 1).maybeSingle<{ infinitepay_handle: string | null }>();
  if (!config?.infinitepay_handle) return NextResponse.json({ erro: "handle não configurado" }, { status: 500 });

  try {
    const r = await conferirPagamento({
      handle: config.infinitepay_handle,
      orderNsu,
      transactionNsu: corpo.transaction_nsu,
      slug: corpo.invoice_slug ?? pagamento.link_slug,
    });
    // 400 faz a InfinitePay tentar de novo mais tarde — útil se a confirmação ainda não propagou.
    if (!r.paid) return NextResponse.json({ erro: "pagamento não confirmado em payment_check" }, { status: 400 });

    await supabase
      .from("pagamentos")
      .update({
        data_pagamento: hojeISO(),
        forma_pagamento: "cartao",
        transaction_nsu: r.transactionNsu ?? corpo.transaction_nsu ?? null,
        recibo_url: r.reciboUrl ?? corpo.receipt_url ?? null,
      })
      .eq("id", pagamento.id)
      .is("data_pagamento", null);

    return NextResponse.json({ ok: true, pagamento: pagamento.id });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha ao confirmar" }, { status: 400 });
  }
}
