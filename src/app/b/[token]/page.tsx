import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONFIG_PADRAO } from "@/lib/configuracoes";
import type { PerguntaBriefing, Respostas, StatusBriefing } from "@/lib/briefing";
import { BriefingPublico } from "./briefing-publico";

/*
 * Briefing respondido pelo cliente, sem login. Fora do grupo (app) de propósito:
 * o proxy não intercepta `b/` e não existe sessão aqui — o token é a credencial.
 */

export const dynamic = "force-dynamic";

type BriefingJoin = {
  id: string;
  token: string;
  status: StatusBriefing;
  respostas: Respostas;
  respondido_em: string | null;
  projetos: { nome: string; tipo: string | null; clientes: { nome: string; empresa: string | null } | null } | null;
};

export async function generateMetadata() {
  return { title: "Briefing", robots: { index: false, follow: false } };
}

export default async function BriefingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = createAdminClient();
  const [{ data: briefing }, { data: perguntas }, { data: config }] = await Promise.all([
    supabase
      .from("briefings")
      .select("id, token, status, respostas, respondido_em, projetos(nome, tipo, clientes(nome, empresa))")
      .eq("token", token)
      .maybeSingle<BriefingJoin>(),
    supabase.from("briefing_perguntas").select("*").eq("ativa", true).order("ordem").returns<PerguntaBriefing[]>(),
    supabase
      .from("configuracoes")
      .select("nome, titulo, briefing_intro, email_contato, telefone")
      .eq("id", 1)
      .maybeSingle<{ nome: string | null; titulo: string | null; briefing_intro: string | null; email_contato: string | null; telefone: string | null }>(),
  ]);

  // Rascunho não abre por link: o briefing só existe pro cliente depois de enviado.
  if (!briefing || briefing.status === "rascunho") notFound();

  if (!briefing.respondido_em) {
    await supabase.from("briefings").update({ vista_em: new Date().toISOString() }).eq("id", briefing.id).is("vista_em", null);
  }

  return (
    <BriefingPublico
      token={briefing.token}
      status={briefing.status}
      respostasIniciais={briefing.respostas ?? {}}
      perguntas={perguntas ?? []}
      tipoProjeto={briefing.projetos?.tipo ?? null}
      projeto={briefing.projetos?.nome ?? "seu projeto"}
      cliente={briefing.projetos?.clientes?.empresa ?? briefing.projetos?.clientes?.nome ?? null}
      intro={config?.briefing_intro ?? ""}
      contato={{
        nome: config?.nome ?? CONFIG_PADRAO.nome ?? "Mayara Lima",
        titulo: config?.titulo ?? CONFIG_PADRAO.titulo ?? "Desenvolvedora Web",
        email: config?.email_contato ?? null,
        telefone: config?.telefone ?? null,
      }}
    />
  );
}
