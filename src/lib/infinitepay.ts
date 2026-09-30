/*
 * Checkout da InfinitePay: cria link de cobrança e confere pagamento.
 * A API não usa token — identifica pelo `handle` (InfiniteTag). Por isso o webhook NUNCA marca
 * pago sozinho: ele sempre confirma em `payment_check` antes de escrever no banco.
 * Docs: https://www.infinitepay.io/checkout-documentacao
 */

const API = process.env.INFINITEPAY_API_URL ?? "https://api.checkout.infinitepay.io";

export type ItemCobranca = { quantity: number; price: number; description: string };

export type RespostaLink = { url?: string; link?: string; slug?: string; invoice_slug?: string; [k: string]: unknown };

async function post<T>(caminho: string, corpo: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${API}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(corpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`InfinitePay ${r.status}: ${texto.slice(0, 300)}`);
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error(`Resposta inesperada da InfinitePay: ${texto.slice(0, 200)}`);
  }
}

/** Cria o link de pagamento. `valor` em reais; a API espera centavos. */
export async function criarLinkCobranca({
  handle,
  valor,
  descricao,
  orderNsu,
  webhookUrl,
  redirectUrl,
  cliente,
}: {
  handle: string;
  valor: number;
  descricao: string;
  orderNsu: string;
  webhookUrl?: string;
  redirectUrl?: string;
  cliente?: { name?: string | null; email?: string | null; phone_number?: string | null };
}) {
  const centavos = Math.round(valor * 100);
  if (centavos < 100) throw new Error("Valor muito baixo pra gerar cobrança.");

  const resposta = await post<RespostaLink>("/links", {
    handle: handle.replace(/^\$/, ""),
    order_nsu: orderNsu,
    items: [{ quantity: 1, price: centavos, description: descricao.slice(0, 120) } satisfies ItemCobranca],
    ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
    ...(cliente?.name || cliente?.email
      ? {
          customer: {
            ...(cliente.name ? { name: cliente.name } : {}),
            ...(cliente.email ? { email: cliente.email } : {}),
            ...(cliente.phone_number ? { phone_number: cliente.phone_number.replace(/\D/g, "") } : {}),
          },
        }
      : {}),
  });

  const url = resposta.url ?? resposta.link;
  if (!url) throw new Error("A InfinitePay não devolveu o link.");
  return { url, slug: resposta.slug ?? resposta.invoice_slug ?? null };
}

export type Confirmacao = { paid: boolean; amount: number | null; transactionNsu: string | null; reciboUrl: string | null; parcelas: number | null };

/** Confere na InfinitePay se a cobrança foi mesmo paga (fonte da verdade do webhook). */
export async function conferirPagamento({ handle, orderNsu, transactionNsu, slug }: { handle: string; orderNsu: string; transactionNsu?: string | null; slug?: string | null }): Promise<Confirmacao> {
  const r = await post<Record<string, unknown>>("/payment_check", {
    handle: handle.replace(/^\$/, ""),
    order_nsu: orderNsu,
    ...(transactionNsu ? { transaction_nsu: transactionNsu } : {}),
    ...(slug ? { slug } : {}),
  });

  // A resposta varia entre "success", "paid" e "status: approved"; aceita os formatos conhecidos.
  const status = String(r.status ?? r.payment_status ?? "").toLowerCase();
  const paid = r.success === true || r.paid === true || ["approved", "paid", "succeeded"].includes(status);
  const valor = typeof r.paid_amount === "number" ? r.paid_amount : typeof r.amount === "number" ? r.amount : null;

  return {
    paid,
    amount: valor !== null ? valor / 100 : null,
    transactionNsu: (r.transaction_nsu as string) ?? transactionNsu ?? null,
    reciboUrl: (r.receipt_url as string) ?? null,
    parcelas: typeof r.installments === "number" ? r.installments : null,
  };
}
