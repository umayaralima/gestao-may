import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUrl } from "@/lib/enviar-resumo";

/*
 * Feed iCal privado: tarefas com prazo + entregas de projeto, pra assinar no Google Agenda
 * ("Outros calendários → A partir do URL"). O token secreto está em configuracoes.agenda_token;
 * trocar o token invalida o link antigo. Sem OAuth do Google.
 */

export const dynamic = "force-dynamic";

type TarefaLinha = {
  id: string;
  titulo: string;
  descricao: string | null;
  vencimento: string;
  categoria: string;
  prioridade: string;
  concluida_em: string | null;
  projeto_id: string | null;
  projetos: { nome: string; clientes: { nome: string; empresa: string | null } | null } | null;
  clientes: { nome: string; empresa: string | null } | null;
  leads: { nome: string; empresa: string | null } | null;
};
type ProjetoLinha = { id: string; nome: string; prazo_entrega: string; status: string; clientes: { nome: string; empresa: string | null } | null };

const nomeDe = (c: { nome: string; empresa: string | null } | null | undefined) => (c ? (c.empresa ?? c.nome) : null);
const escapar = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const semTraco = (iso: string) => iso.replace(/-/g, "");
/** Quebra em linhas de 75 octetos, como manda o RFC 5545. */
const dobrar = (linha: string) => linha.match(/.{1,73}/g)?.join("\r\n ") ?? linha;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse("Não encontrado", { status: 404 });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new NextResponse("Feed indisponível: falta SUPABASE_SERVICE_ROLE_KEY no servidor.", { status: 503 });
  }
  const { data: config } = await supabase.from("configuracoes").select("id, nome").eq("agenda_token", token).maybeSingle<{ id: number; nome: string | null }>();
  if (!config) return new NextResponse("Não encontrado", { status: 404 });

  const [{ data: tarefas }, { data: projetos }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("id, titulo, descricao, vencimento, categoria, prioridade, concluida_em, projeto_id, projetos(nome, clientes(nome, empresa)), clientes(nome, empresa), leads(nome, empresa)")
      .not("vencimento", "is", null)
      .order("vencimento")
      .returns<TarefaLinha[]>(),
    supabase
      .from("projetos")
      .select("id, nome, prazo_entrega, status, clientes(nome, empresa)")
      .not("prazo_entrega", "is", null)
      .not("status", "in", "(cancelado)")
      .returns<ProjetoLinha[]>(),
  ]);

  const url = baseUrl();
  const agora = `${semTraco(new Date().toISOString().slice(0, 10))}T${new Date().toISOString().slice(11, 19).replace(/:/g, "")}Z`;
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mayara Lima//Gestao//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar("Gestão · Mayara")}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
  ];

  const evento = (uid: string, dia: string, titulo: string, descricao: string, link: string, transparente: boolean) => {
    // Evento de dia inteiro: DTEND é exclusivo, por isso o dia seguinte.
    const fim = new Date(`${dia}T12:00:00`);
    fim.setDate(fim.getDate() + 1);
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${uid}@gestao.mayaralima`,
      `DTSTAMP:${agora}`,
      `DTSTART;VALUE=DATE:${semTraco(dia)}`,
      `DTEND;VALUE=DATE:${semTraco(fim.toISOString().slice(0, 10))}`,
      dobrar(`SUMMARY:${escapar(titulo)}`),
      dobrar(`DESCRIPTION:${escapar(descricao)}`),
      dobrar(`URL:${link}`),
      `TRANSP:${transparente ? "TRANSPARENT" : "OPAQUE"}`,
      "END:VEVENT",
    );
  };

  for (const t of tarefas ?? []) {
    const dono = nomeDe(t.projetos?.clientes) ?? nomeDe(t.clientes) ?? nomeDe(t.leads);
    const feita = !!t.concluida_em;
    const titulo = `${feita ? "✓ " : t.prioridade === "alta" ? "🔴 " : ""}${t.titulo}${dono ? ` — ${dono}` : ""}`;
    const descricao = [t.descricao, t.projetos?.nome ? `Projeto: ${t.projetos.nome}` : null, `Categoria: ${t.categoria}`, feita ? "Concluída" : null].filter(Boolean).join("\n");
    evento(`tarefa-${t.id}`, t.vencimento, titulo, descricao, t.projeto_id ? `${url}/projetos/${t.projeto_id}?aba=etapas` : `${url}/tarefas`, feita);
  }

  for (const p of projetos ?? []) {
    const cliente = nomeDe(p.clientes);
    evento(`entrega-${p.id}`, p.prazo_entrega, `📦 Entrega: ${p.nome}${cliente ? ` — ${cliente}` : ""}`, `Prazo de entrega do projeto.`, `${url}/projetos/${p.id}`, ["entregue", "concluido"].includes(p.status));
  }

  linhas.push("END:VCALENDAR");

  return new NextResponse(linhas.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="gestao.ics"',
      "Cache-Control": "public, max-age=1800",
    },
  });
}
