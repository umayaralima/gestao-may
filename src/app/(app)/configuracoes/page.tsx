import { getConfiguracoes } from "@/lib/configuracoes";
import { ETAPA_LEAD_LABEL, ETAPAS_PIPELINE } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaTarefa, TipoProjeto } from "@/lib/types";
import { ConfiguracoesView } from "./configuracoes";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [config, { data: tipos }, { data: emUso }, { data: leadsUso }, { data: categorias }, { data: tarefasUso }] = await Promise.all([
    getConfiguracoes(),
    supabase.from("tipos_projeto").select("*").order("ordem").order("nome").returns<TipoProjeto[]>(),
    supabase.from("projetos").select("tipo").not("tipo", "is", null).returns<Array<{ tipo: string }>>(),
    supabase.from("leads").select("servico_interesse").not("servico_interesse", "is", null).returns<Array<{ servico_interesse: string }>>(),
    supabase.from("categorias_tarefa").select("*").order("ordem").order("nome").returns<CategoriaTarefa[]>(),
    supabase.from("tarefas").select("categoria").returns<Array<{ categoria: string }>>(),
  ]);

  const usoCategorias: Record<string, number> = {};
  for (const t of tarefasUso ?? []) usoCategorias[t.categoria] = (usoCategorias[t.categoria] ?? 0) + 1;

  const usoTipos: Record<string, number> = {};
  for (const p of emUso ?? []) usoTipos[p.tipo] = (usoTipos[p.tipo] ?? 0) + 1;
  for (const l of leadsUso ?? []) usoTipos[l.servico_interesse] = (usoTipos[l.servico_interesse] ?? 0) + 1;

  return <ConfiguracoesView config={config} tipos={tipos ?? []} usoTipos={usoTipos} categorias={categorias ?? []} usoCategorias={usoCategorias} etapas={ETAPAS_PIPELINE.map((e) => ETAPA_LEAD_LABEL[e])} />;
}
