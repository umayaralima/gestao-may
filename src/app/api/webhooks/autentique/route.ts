import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { consultarDocumentoAutentique, situacao } from "@/lib/autentique";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook do Autentique: quando o documento é finalizado (ou uma assinatura muda), consulta a API
 * e atualiza o contrato. Assim o projeto vira "assinado" sozinho e o banner de aprovar aparece.
 * Validação por HMAC-SHA256 no header x-autentique-signature (segredo em AUTENTIQUE_WEBHOOK_SECRET).
 */

type EventoAutentique = {
  event?: { id?: string; type?: string; data?: { object?: { id?: string; document?: { id?: string } } } };
  // formato antigo manda o documento direto
  id?: string;
  type?: string;
};

function assinaturaConfere(corpo: string, header: string | null, segredo: string) {
  if (!header) return false;
  const esperado = createHmac("sha256", segredo).update(corpo).digest("hex");
  const recebido = header.replace(/^sha256=/, "").trim();
  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(recebido, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const corpo = await request.text();
  const segredo = process.env.AUTENTIQUE_WEBHOOK_SECRET;

  if (segredo && !assinaturaConfere(corpo, request.headers.get("x-autentique-signature"), segredo)) {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  let evento: EventoAutentique;
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const documentoId = evento.event?.data?.object?.document?.id ?? evento.event?.data?.object?.id ?? evento.id;
  if (!documentoId) return NextResponse.json({ ignorado: "sem id de documento" });

  const supabase = createAdminClient();
  const { data: contrato } = await supabase.from("contratos").select("id, projeto_id, status").eq("autentique_id", documentoId).maybeSingle<{ id: string; projeto_id: string; status: string }>();
  if (!contrato) return NextResponse.json({ ignorado: "documento não é de nenhum contrato" });

  try {
    const doc = await consultarDocumentoAutentique(documentoId);
    const s = situacao(doc);
    await supabase
      .from("contratos")
      .update({
        autentique_dados: doc,
        status: s.concluido ? "assinado" : contrato.status === "rascunho" ? "enviado" : contrato.status,
        data_assinatura: s.concluido ? (s.ultimaAssinatura ?? new Date().toISOString()).slice(0, 10) : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", contrato.id);

    return NextResponse.json({ ok: true, contrato: contrato.id, assinado: s.concluido });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "falha ao consultar" }, { status: 500 });
  }
}
