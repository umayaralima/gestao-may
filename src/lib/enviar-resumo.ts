import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, htmlResumo, montarResumo } from "@/lib/resumo-diario";
import { hojeISO } from "@/lib/format";

/** Endereço público do sistema (links do e-mail). */
export function baseUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

export type ResultadoEnvio = { ok?: boolean; pulado?: string; erro?: string; itens?: number; destino?: string };

/**
 * Envia o resumo do dia. `forcar` ignora "já enviei hoje" e o desligamento em Configurações
 * (usado pelo botão "Enviar agora"). Registra o envio em `envios_resumo`.
 */
export async function enviarResumoDiario({ forcar }: { forcar: boolean }): Promise<ResultadoEnvio> {
  const supabase = createAdminClient();
  const hoje = hojeISO();

  const { data: config } = await supabase.from("configuracoes").select("nome, email_contato, resumo_diario, resumo_email").eq("id", 1).maybeSingle<{
    nome: string | null;
    email_contato: string | null;
    resumo_diario: boolean;
    resumo_email: string | null;
  }>();

  if (!forcar && config && !config.resumo_diario) return { pulado: "Resumo diário desligado em Configurações." };

  const destino = config?.resumo_email?.trim() || config?.email_contato?.trim() || process.env.ALLOWED_EMAIL;
  if (!destino) return { erro: "Sem e-mail de destino: preencha em Configurações → Notificações." };

  if (!forcar) {
    const { data: jaEnviado } = await supabase.from("envios_resumo").select("id").eq("dia", hoje).maybeSingle();
    if (jaEnviado) return { pulado: "Resumo de hoje já enviado." };
  }

  const url = baseUrl();
  const resumo = await montarResumo(url);
  const nome = config?.nome ?? "Mayara";
  const assunto = resumo.total === 0 ? "Seu dia está limpo ✓" : `Seu dia: ${resumo.total} item(ns)${resumo.atrasadas.length ? ` · ${resumo.atrasadas.length} atrasado(s)` : ""}`;

  try {
    await enviarEmail({ para: destino, assunto, html: htmlResumo(resumo, url, nome) });
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha ao enviar.";
    await supabase.from("envios_resumo").upsert({ dia: hoje, destino, itens: resumo.total, erro }, { onConflict: "dia" });
    return { erro };
  }

  await supabase.from("envios_resumo").upsert({ dia: hoje, destino, itens: resumo.total, erro: null }, { onConflict: "dia" });
  return { ok: true, itens: resumo.total, destino };
}
