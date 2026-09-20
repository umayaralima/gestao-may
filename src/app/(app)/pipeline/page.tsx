import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca } from "@/components/ui/primitivos";
import { PRIORIDADE_COR, PRIORIDADE_LABEL, PRIORIDADES } from "@/lib/constantes";
import { getConfiguracoes } from "@/lib/configuracoes";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";
import { Kanban } from "./kanban";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ q?: string; prioridade?: string; novo?: string }> }) {
  const { q = "", prioridade = "", novo } = await searchParams;
  const supabase = await createClient();

  const [{ data: leads }, { data: tipos }, config] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .neq("etapa", "perdido")
      .order("proximo_followup", { ascending: true, nullsFirst: false })
      .order("atualizado_em", { ascending: false })
      .returns<Lead[]>(),
    supabase.from("tipos_projeto").select("nome").order("ordem").order("nome"),
    getConfiguracoes(),
  ]);

  const termo = q.trim().toLowerCase();
  const filtrados = (leads ?? [])
    .filter((l) => !prioridade || l.prioridade === prioridade)
    .filter((l) => !termo || [l.nome, l.empresa, l.servico_interesse, l.email].some((v) => v?.toLowerCase().includes(termo)));

  return (
    <Kanban
      leads={filtrados}
      tipos={(tipos ?? []).map((t) => t.nome)}
      diasParado={config.dias_negocio_parado}
      abrirNovo={novo === "1"}
      busca={<Busca key="busca" placeholder="Buscar negócio…" defaultValue={q} className="sm:w-44" />}
      filtro={
        <FiltroMenu key="filtro"
          param="prioridade"
          rotulo="Prioridade"
          opcoes={[{ valor: "", label: "Todas" }, ...PRIORIDADES.map((p) => ({ valor: p, label: PRIORIDADE_LABEL[p], cor: PRIORIDADE_COR[p] }))]}
        />
      }
    />
  );
}
