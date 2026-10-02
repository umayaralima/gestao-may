import { getConfiguracoes } from "@/lib/configuracoes";
import { baseUrl } from "@/lib/enviar-resumo";
import { ETAPA_LEAD_LABEL, ETAPAS_PIPELINE } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaTarefa, EtapaModelo, ModeloContrato, TipoProjeto } from "@/lib/types";
import { ConfiguracoesView } from "./configuracoes";
import type { EntradaLead } from "./integracoes";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [config, { data: tipos }, { data: emUso }, { data: leadsUso }, { data: categorias }, { data: tarefasUso }, { data: etapasModelo }, { data: ultimoEnvio }, { data: auth }, { data: modelosContrato }, { data: entradasLead }] = await Promise.all([
    getConfiguracoes(),
    supabase.from("tipos_projeto").select("*").order("ordem").order("nome").returns<TipoProjeto[]>(),
    supabase.from("projetos").select("tipo").not("tipo", "is", null).returns<Array<{ tipo: string }>>(),
    supabase.from("leads").select("servico_interesse").not("servico_interesse", "is", null).returns<Array<{ servico_interesse: string }>>(),
    supabase.from("categorias_tarefa").select("*").order("ordem").order("nome").returns<CategoriaTarefa[]>(),
    supabase.from("tarefas").select("categoria").returns<Array<{ categoria: string }>>(),
    supabase.from("etapas_modelo").select("*").order("tipo_projeto").order("ordem").returns<EtapaModelo[]>(),
    supabase.from("envios_resumo").select("dia, destino, itens, erro").order("dia", { ascending: false }).limit(1).maybeSingle<{ dia: string; destino: string; itens: number; erro: string | null }>(),
    supabase.auth.getUser(),
    supabase.from("modelos_contrato").select("*").order("tipo_projeto").returns<ModeloContrato[]>(),
    supabase.from("entradas_lead").select("id, origem, erro, criado_em, lead_id").order("criado_em", { ascending: false }).limit(8).returns<EntradaLead[]>(),
  ]);

  const usoCategorias: Record<string, number> = {};
  for (const t of tarefasUso ?? []) usoCategorias[t.categoria] = (usoCategorias[t.categoria] ?? 0) + 1;

  const usoTipos: Record<string, number> = {};
  for (const p of emUso ?? []) usoTipos[p.tipo] = (usoTipos[p.tipo] ?? 0) + 1;
  for (const l of leadsUso ?? []) usoTipos[l.servico_interesse] = (usoTipos[l.servico_interesse] ?? 0) + 1;

  const urlLeads = config.leads_token ? `${baseUrl()}/api/leads?token=${config.leads_token}` : null;
  const linkAgenda = config.agenda_token ? `${baseUrl()}/api/agenda/${config.agenda_token}` : null;

  return <ConfiguracoesView config={config} tipos={tipos ?? []} usoTipos={usoTipos} categorias={categorias ?? []} usoCategorias={usoCategorias} etapasModelo={etapasModelo ?? []} emailLogin={auth.user?.email ?? ""} linkAgenda={linkAgenda} ultimoEnvio={ultimoEnvio ?? null} modelosContrato={modelosContrato ?? []} urlLeads={urlLeads} entradasLead={entradasLead ?? []} etapas={ETAPAS_PIPELINE.map((e) => ETAPA_LEAD_LABEL[e])} />;
}
