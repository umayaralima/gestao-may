import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, hojeISO } from "@/lib/format";
import type { Proposta } from "@/lib/types";
import { PropostaPublica } from "./proposta-publica";

/*
 * Página pública da proposta (sem login): o cliente abre pelo link, lê e aceita ou recusa.
 * Fora do grupo (app) de propósito — o proxy não intercepta e não existe sessão aqui.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { title: "Proposta" };
  const supabase = createAdminClient();
  const { data } = await supabase.from("propostas").select("titulo, numero").eq("token", token).maybeSingle<{ titulo: string; numero: string | null }>();
  return { title: data ? `Proposta ${data.numero ?? ""} · ${data.titulo}` : "Proposta", robots: { index: false, follow: false } };
}

export default async function PropostaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = createAdminClient();
  const { data: proposta } = await supabase
    .from("propostas")
    .select("*, configuracoes:id")
    .eq("token", token)
    .maybeSingle<Proposta>();
  if (!proposta?.documento) notFound();

  // Rascunho não deve ser visível por link
  if (proposta.status === "rascunho") notFound();

  const [{ data: config }] = await Promise.all([
    supabase.from("configuracoes").select("nome, titulo, email_contratual, email_contato, telefone, site").eq("id", 1).maybeSingle<{
      nome: string | null;
      titulo: string | null;
      email_contratual: string | null;
      email_contato: string | null;
      telefone: string | null;
      site: string | null;
    }>(),
    // marca a primeira abertura
    proposta.vista_em ? Promise.resolve(null) : supabase.from("propostas").update({ vista_em: new Date().toISOString() }).eq("id", proposta.id),
  ]);

  const expirada = !!proposta.validade && proposta.validade < hojeISO() && proposta.status === "enviada";

  return (
    <PropostaPublica
      proposta={{
        id: proposta.id,
        token: proposta.token,
        numero: proposta.numero,
        titulo: proposta.titulo,
        documento: proposta.documento,
        valor: proposta.valor,
        validade: proposta.validade,
        validadeFormatada: proposta.validade ? formatDate(proposta.validade) : null,
        status: expirada ? "expirada" : proposta.status,
        resposta: proposta.resposta_cliente,
      }}
      contato={{
        nome: config?.nome ?? "Mayara Lima",
        titulo: config?.titulo ?? "Desenvolvedora Web",
        email: config?.email_contratual ?? config?.email_contato ?? null,
        telefone: config?.telefone ?? null,
        site: config?.site ?? null,
      }}
    />
  );
}
