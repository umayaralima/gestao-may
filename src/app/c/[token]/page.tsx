import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONFIG_PADRAO } from "@/lib/configuracoes";
import { PORTAL_FECHADO, etapasDoPortal, type Aprovacao } from "@/lib/portal";
import type { StatusProjeto } from "@/lib/constantes";
import type { Pagamento, Tarefa } from "@/lib/types";
import { PortalPublico } from "./portal-publico";

/*
 * Portal do cliente, sem login. Fora do grupo (app) de propósito: o proxy não
 * intercepta `c/` e não existe sessão aqui — o token é a credencial.
 *
 * Só sai daqui o que o cliente pode ver. Nada de valor de custo, margem,
 * observação interna ou prazo de etapa (ver comentário em `etapasDoPortal`).
 */

export const dynamic = "force-dynamic";

type ProjetoPortal = {
  id: string;
  nome: string;
  tipo: string | null;
  status: StatusProjeto;
  prazo_entrega: string | null;
  portal_token: string;
  portal_vista_em: string | null;
  clientes: { nome: string; empresa: string | null } | null;
};

export async function generateMetadata() {
  return { title: "Acompanhe seu projeto", robots: { index: false, follow: false } };
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = createAdminClient();
  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, nome, tipo, status, prazo_entrega, portal_token, portal_vista_em, clientes(nome, empresa)")
    .eq("portal_token", token)
    .maybeSingle<ProjetoPortal>();

  if (!projeto || PORTAL_FECHADO.includes(projeto.status)) notFound();

  const [{ data: tarefas }, { data: aprovacoes }, { data: parcelas }, { data: briefing }, { data: config }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("*")
      .eq("projeto_id", projeto.id)
      .not("ordem", "is", null)
      .order("ordem")
      .returns<Tarefa[]>(),
    supabase
      .from("aprovacoes")
      .select("*")
      .eq("projeto_id", projeto.id)
      .order("criado_em", { ascending: false })
      .returns<Aprovacao[]>(),
    supabase
      .from("pagamentos_view")
      .select("id, tipo, valor, vencimento, status")
      .eq("projeto_id", projeto.id)
      .order("vencimento")
      .returns<Pick<Pagamento, "id" | "tipo" | "valor" | "vencimento" | "status">[]>(),
    supabase
      .from("briefings")
      .select("token, status")
      .eq("projeto_id", projeto.id)
      .maybeSingle<{ token: string; status: string }>(),
    supabase
      .from("configuracoes")
      .select("nome, titulo, email_contato, telefone")
      .eq("id", 1)
      .maybeSingle<{ nome: string | null; titulo: string | null; email_contato: string | null; telefone: string | null }>(),
  ]);

  if (!projeto.portal_vista_em) {
    await supabase
      .from("projetos")
      .update({ portal_vista_em: new Date().toISOString() })
      .eq("id", projeto.id)
      .is("portal_vista_em", null);
  }

  // O link do briefing só vai pro portal se ainda faltar o cliente responder.
  const briefingPendente = !!briefing && briefing.status === "enviado";

  return (
    <PortalPublico
      token={projeto.portal_token}
      projeto={{ nome: projeto.nome, tipo: projeto.tipo, status: projeto.status, prazo: projeto.prazo_entrega }}
      cliente={projeto.clientes?.empresa ?? projeto.clientes?.nome ?? null}
      etapas={etapasDoPortal(tarefas ?? [])}
      aprovacoes={aprovacoes ?? []}
      parcelas={(parcelas ?? []).map((p) => ({ ...p, valor: Number(p.valor) }))}
      linkBriefing={briefingPendente ? `/b/${briefing!.token}` : null}
      contato={{
        nome: config?.nome ?? CONFIG_PADRAO.nome ?? "Mayara Lima",
        titulo: config?.titulo ?? CONFIG_PADRAO.titulo ?? "Desenvolvedora Web",
        email: config?.email_contato ?? null,
        telefone: config?.telefone ?? null,
      }}
    />
  );
}
