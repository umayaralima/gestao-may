import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca } from "@/components/ui/primitivos";
import { CATEGORIA_TAREFA_LABEL, CATEGORIAS_TAREFA, PRIORIDADE_COR, PRIORIDADE_LABEL, PRIORIDADES } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import type { Tarefa } from "@/lib/types";
import { Tarefas, type TarefaComVinculo, type Vinculo } from "./tarefas";

type TarefaJoin = Tarefa & { clientes: { nome: string; empresa: string | null } | null; leads: { nome: string; empresa: string | null } | null };

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; prioridade?: string; ver?: string; nova?: string; cliente?: string; data?: string }>;
}) {
  const { q = "", categoria = "", prioridade = "", ver = "dia", nova, cliente, data } = await searchParams;
  const supabase = await createClient();

  const [{ data: tarefas }, { data: clientes }, { data: leads }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("*, clientes(nome, empresa), leads(nome, empresa)")
      .order("vencimento", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .returns<TarefaJoin[]>(),
    supabase.from("clientes").select("id, nome, empresa").eq("status", "ativo").order("nome"),
    supabase.from("leads").select("id, nome, empresa").in("etapa", ["novo", "em_contato", "proposta_enviada", "negociando"]).order("nome"),
  ]);

  const termo = q.trim().toLowerCase();
  const lista: TarefaComVinculo[] = (tarefas ?? [])
    .map((t) => {
      const dono = t.clientes ?? t.leads;
      return { ...t, vinculoNome: dono ? (dono.empresa ?? dono.nome) : null, vinculoTipo: t.clientes ? ("cliente" as const) : t.leads ? ("lead" as const) : null };
    })
    .filter((t) => !categoria || t.categoria === categoria)
    .filter((t) => !prioridade || t.prioridade === prioridade)
    .filter((t) => !termo || t.titulo.toLowerCase().includes(termo) || t.vinculoNome?.toLowerCase().includes(termo));

  const vinculos: Vinculo[] = [
    ...(clientes ?? []).map((c) => ({ valor: `cliente:${c.id}`, label: c.empresa ?? c.nome, grupo: "Clientes" as const })),
    ...(leads ?? []).map((l) => ({ valor: `lead:${l.id}`, label: l.empresa ?? l.nome, grupo: "Pipeline" as const })),
  ];

  return (
    <Tarefas
      tarefas={lista}
      vinculos={vinculos}
      visao={ver === "semana" || ver === "mes" ? ver : "dia"}
      dataBase={data}
      abrirNova={nova === "1"}
      vinculoInicial={cliente ? `cliente:${cliente}` : undefined}
      busca={<Busca placeholder="Buscar tarefa ou cliente…" defaultValue={q} className="w-56" />}
      filtros={
        <>
          <FiltroMenu param="categoria" rotulo="Categoria" opcoes={[{ valor: "", label: "Todas" }, ...CATEGORIAS_TAREFA.map((c) => ({ valor: c, label: CATEGORIA_TAREFA_LABEL[c] }))]} />
          <FiltroMenu param="prioridade" rotulo="Prioridade" opcoes={[{ valor: "", label: "Todas" }, ...PRIORIDADES.map((p) => ({ valor: p, label: PRIORIDADE_LABEL[p], cor: PRIORIDADE_COR[p] }))]} />
        </>
      }
    />
  );
}
