import { createAdminClient } from "@/lib/supabase/admin";
import { ETAPAS_LEAD_ABERTAS } from "@/lib/constantes";
import { diffDias, fmt, fmtData, hojeISO, somarDias } from "@/lib/format";

/*
 * Monta o resumo do dia (tarefas, etapas atrasadas, parcelas e follow-ups) e gera o HTML do e-mail.
 * Roda sem sessão (cron), então usa o cliente de serviço.
 */

export type ItemResumo = { texto: string; detalhe?: string; alerta?: boolean; href?: string };
export type Resumo = {
  data: string;
  total: number;
  hoje: ItemResumo[];
  atrasadas: ItemResumo[];
  followups: ItemResumo[];
  cobrancas: ItemResumo[];
  entregas: ItemResumo[];
};

type TarefaLinha = {
  id: string;
  titulo: string;
  vencimento: string | null;
  categoria: string;
  prioridade: string;
  projeto_id: string | null;
  projetos: { nome: string; clientes: { nome: string; empresa: string | null } | null } | null;
  clientes: { nome: string; empresa: string | null } | null;
  leads: { nome: string; empresa: string | null } | null;
};
type PagLinha = { id: string; valor: number; vencimento: string; status: string; projetos: { nome: string; clientes: { nome: string; empresa: string | null } | null } | null };
type FollowLinha = { id: string; nome: string; empresa: string | null; proximo_followup: string | null; nota_followup: string | null };
type ProjetoLinha = { id: string; nome: string; prazo_entrega: string | null; status: string; clientes: { nome: string; empresa: string | null } | null };

const nomeDe = (c: { nome: string; empresa: string | null } | null | undefined) => (c ? (c.empresa ?? c.nome) : null);

export async function montarResumo(baseUrl: string): Promise<Resumo> {
  const supabase = createAdminClient();
  const hoje = hojeISO();
  const em7 = somarDias(hoje, 7);

  const [{ data: tarefas }, { data: pagamentos }, { data: leads }, { data: clientes }, { data: projetos }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("id, titulo, vencimento, categoria, prioridade, projeto_id, projetos(nome, clientes(nome, empresa)), clientes(nome, empresa), leads(nome, empresa)")
      .is("concluida_em", null)
      .not("vencimento", "is", null)
      .lte("vencimento", hoje)
      .order("vencimento")
      .returns<TarefaLinha[]>(),
    supabase
      .from("pagamentos_view")
      .select("id, valor, vencimento, status, projetos(nome, clientes(nome, empresa))")
      .neq("status", "pago")
      .lte("vencimento", em7)
      .order("vencimento")
      .returns<PagLinha[]>(),
    supabase.from("leads").select("id, nome, empresa, proximo_followup, nota_followup").in("etapa", ETAPAS_LEAD_ABERTAS).lte("proximo_followup", hoje).order("proximo_followup").returns<FollowLinha[]>(),
    supabase.from("clientes").select("id, nome, empresa, proximo_followup, nota_followup").eq("status", "ativo").lte("proximo_followup", hoje).order("proximo_followup").returns<FollowLinha[]>(),
    supabase
      .from("projetos")
      .select("id, nome, prazo_entrega, status, clientes(nome, empresa)")
      .in("status", ["aprovado", "em_desenvolvimento", "em_revisao"])
      .not("prazo_entrega", "is", null)
      .lte("prazo_entrega", em7)
      .order("prazo_entrega")
      .returns<ProjetoLinha[]>(),
  ]);

  const rotuloTarefa = (t: TarefaLinha) => {
    const dono = nomeDe(t.projetos?.clientes) ?? nomeDe(t.clientes) ?? nomeDe(t.leads);
    const proj = t.projetos?.nome;
    return [dono, proj].filter(Boolean).join(" · ") || t.categoria;
  };

  const doDia = (tarefas ?? []).filter((t) => t.vencimento === hoje);
  const vencidas = (tarefas ?? []).filter((t) => t.vencimento! < hoje);

  const hojeItens: ItemResumo[] = doDia.map((t) => ({
    texto: t.titulo,
    detalhe: rotuloTarefa(t),
    alerta: t.prioridade === "alta",
    href: t.projeto_id ? `${baseUrl}/projetos/${t.projeto_id}?aba=etapas` : `${baseUrl}/tarefas`,
  }));

  const atrasadas: ItemResumo[] = vencidas.map((t) => {
    const dias = Math.abs(diffDias(hoje, t.vencimento!));
    return {
      texto: t.titulo,
      detalhe: `${rotuloTarefa(t)} · ${dias} dia(s) de atraso`,
      alerta: true,
      href: t.projeto_id ? `${baseUrl}/projetos/${t.projeto_id}?aba=etapas` : `${baseUrl}/tarefas`,
    };
  });

  const followups: ItemResumo[] = [
    ...(leads ?? []).map((l) => ({ tipo: "pipeline" as const, l })),
    ...(clientes ?? []).map((l) => ({ tipo: "clientes" as const, l })),
  ].map(({ tipo, l }) => ({
    texto: l.empresa ?? l.nome,
    detalhe: [l.nota_followup, l.proximo_followup === hoje ? "hoje" : `desde ${fmtData(l.proximo_followup, false)}`].filter(Boolean).join(" · "),
    alerta: !!l.proximo_followup && l.proximo_followup < hoje,
    href: `${baseUrl}/${tipo}/${l.id}${tipo === "clientes" ? "?aba=relacionamento" : ""}`,
  }));

  const cobrancas: ItemResumo[] = (pagamentos ?? []).map((p) => {
    const dias = diffDias(hoje, p.vencimento);
    return {
      texto: `${fmt(p.valor)} — ${nomeDe(p.projetos?.clientes) ?? "cliente"}`,
      detalhe: `${p.projetos?.nome ?? "projeto"} · ${p.status === "atrasado" ? `vencida há ${Math.abs(dias)} dia(s)` : dias === 0 ? "vence hoje" : `vence em ${dias} dia(s)`}`,
      alerta: p.status === "atrasado",
      href: `${baseUrl}/financeiro`,
    };
  });

  const entregas: ItemResumo[] = (projetos ?? []).map((p) => {
    const dias = diffDias(hoje, p.prazo_entrega!);
    return {
      texto: p.nome,
      detalhe: `${nomeDe(p.clientes) ?? "cliente"} · ${dias < 0 ? `entrega atrasada ${Math.abs(dias)} dia(s)` : dias === 0 ? "entrega hoje" : `entrega em ${dias} dia(s)`}`,
      alerta: dias <= 0,
      href: `${baseUrl}/projetos/${p.id}?aba=etapas`,
    };
  });

  return {
    data: hoje,
    total: hojeItens.length + atrasadas.length + followups.length + cobrancas.length + entregas.length,
    hoje: hojeItens,
    atrasadas,
    followups,
    cobrancas,
    entregas,
  };
}

/* ---------- E-mail ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bloco(titulo: string, itens: ItemResumo[], cor: string) {
  if (itens.length === 0) return "";
  const linhas = itens
    .map(
      (i) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #311C45">
        <a href="${i.href}" style="color:${i.alerta ? "#F87171" : "#DDDBD9"};font-size:14px;font-weight:500;text-decoration:none">${esc(i.texto)}</a>
        ${i.detalhe ? `<div style="color:#968F88;font-size:12px;margin-top:2px">${esc(i.detalhe)}</div>` : ""}
      </td></tr>`,
    )
    .join("");
  return `
  <tr><td style="padding:22px 0 6px">
    <span style="color:${cor};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${esc(titulo)}</span>
    <span style="color:#5A496A;font-size:11px;font-family:monospace"> ${itens.length}</span>
  </td></tr>
  <tr><td><table width="100%" cellpadding="0" cellspacing="0">${linhas}</table></td></tr>`;
}

export function htmlResumo(r: Resumo, baseUrl: string, nome: string) {
  const dataExtenso = new Date(`${r.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const corpo =
    r.total === 0
      ? `<tr><td style="padding:28px 0;text-align:center;color:#968F88;font-size:14px">Nada pendente pra hoje. Bom trabalho! 🎉</td></tr>`
      : bloco("Tarefas de hoje", r.hoje, "#C17AD2") +
        bloco("Atrasadas", r.atrasadas, "#F87171") +
        bloco("Follow-ups", r.followups, "#FBBF24") +
        bloco("Cobranças", r.cobrancas, "#34D399") +
        bloco("Entregas", r.entregas, "#60A5FA");

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#150C1D">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#150C1D;padding:24px 12px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#231431;border:1px solid #311C45;border-radius:16px;padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
        <tr><td>
          <div style="color:#F5F5F4;font-size:20px;font-weight:600">Bom dia, ${esc(nome.split(" ")[0])}</div>
          <div style="color:#968F88;font-size:13px;margin-top:4px;text-transform:capitalize">${esc(dataExtenso)}</div>
          <div style="color:#C17AD2;font-size:13px;margin-top:10px">${r.total === 0 ? "Nada pendente" : `${r.total} item(ns) pedindo atenção`}</div>
        </td></tr>
        ${corpo}
        <tr><td style="padding-top:26px">
          <a href="${baseUrl}" style="display:inline-block;background:#B159C7;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:8px">Abrir o sistema</a>
        </td></tr>
        <tr><td style="padding-top:18px;color:#5A496A;font-size:11px">
          Resumo automático do seu sistema de gestão · desligue em Configurações → Notificações
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Envia pelo Resend (HTTP, sem SDK). Retorna o id ou lança. */
export async function enviarEmail({ para, assunto, html }: { para: string; assunto: string; html: string }) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) throw new Error("Falta RESEND_API_KEY.");
  const remetente = process.env.RESEND_FROM ?? "Gestão <onboarding@resend.dev>";

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as { id?: string }).id ?? "";
}
