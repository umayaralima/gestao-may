import { Fragment } from "react";
import { FiltroMenu } from "@/components/ui/filtro-menu";
import { Busca } from "@/components/ui/primitivos";
import { PRIORIDADE_COR, PRIORIDADE_LABEL, PRIORIDADES } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaTarefa, Tarefa } from "@/lib/types";
import { Tarefas, type TarefaComVinculo, type Vinculo } from "./tarefas";

type Dono = { nome: string; empresa: string | null } | null;
type TarefaJoin = Tarefa & { clientes: Dono; leads: Dono; projetos: { nome: string; clientes: Dono } | null };

/** Status de projeto em que ainda faz sentido criar tarefa de produção. */
const STATUS_PROJETO_ATIVO = ["briefing", "orcamento_enviado", "aprovado", "em_desenvolvimento", "em_revisao", "entregue"];

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; prioridade?: string; ver?: string; nova?: string; cliente?: string; projeto?: string; data?: string }>;
}) {
  const { q = "", categoria = "", prioridade = "", ver = "dia", nova, cliente, projeto, data } = await searchParams;
  const supabase = await createClient();

  const [{ data: tarefas }, { data: clientes }, { data: leads }, { data: projetos }, { data: categorias }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("*, clientes(nome, empresa), leads(nome, empresa), projetos(nome, clientes(nome, empresa))")
      .order("vencimento", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .returns<TarefaJoin[]>(),
    supabase.from("clientes").select("id, nome, empresa").eq("status", "ativo").order("nome"),
    supabase.from("leads").select("id, nome, empresa").in("etapa", ["novo", "em_contato", "proposta_enviada", "negociando"]).order("nome"),
    supabase.from("projetos").select("id, nome, clientes(nome, empresa)").in("status", STATUS_PROJETO_ATIVO).order("criado_em", { ascending: false }),
    supabase.from("categorias_tarefa").select("*").order("ordem").order("nome").returns<CategoriaTarefa[]>(),
  ]);

  const termo = q.trim().toLowerCase();
  const lista: TarefaComVinculo[] = (tarefas ?? [])
    .map((t) => {
      if (t.projetos) {
        const c = t.projetos.clientes;
        const dono = c ? (c.empresa ?? c.nome) : null;
        return { ...t, vinculoNome: dono ? `${dono} · ${t.projetos.nome}` : t.projetos.nome, vinculoTipo: "projeto" as const };
      }
      const dono = t.clientes ?? t.leads;
      return { ...t, vinculoNome: dono ? (dono.empresa ?? dono.nome) : null, vinculoTipo: t.clientes ? ("cliente" as const) : t.leads ? ("lead" as const) : null };
    })
    .filter((t) => !categoria || t.categoria === categoria)
    .filter((t) => !prioridade || t.prioridade === prioridade)
    .filter((t) => !termo || t.titulo.toLowerCase().includes(termo) || t.vinculoNome?.toLowerCase().includes(termo));

  const vinculos: Vinculo[] = [
    ...(projetos ?? []).map((p) => {
      const c = p.clientes as unknown as Dono;
      return { valor: `projeto:${p.id}`, label: c ? `${c.empresa ?? c.nome} · ${p.nome}` : p.nome, grupo: "Projetos" as const };
    }),
    ...(clientes ?? []).map((c) => ({ valor: `cliente:${c.id}`, label: c.empresa ?? c.nome, grupo: "Clientes" as const })),
    ...(leads ?? []).map((l) => ({ valor: `lead:${l.id}`, label: l.empresa ?? l.nome, grupo: "Pipeline" as const })),
  ];

  const vinculoInicial = projeto ? `projeto:${projeto}` : cliente ? `cliente:${cliente}` : undefined;

  return (
    <Tarefas
      tarefas={lista}
      vinculos={vinculos}
      categorias={categorias ?? []}
      visao={ver === "semana" || ver === "mes" ? ver : "dia"}
      dataBase={data}
      abrirNova={nova === "1"}
      vinculoInicial={vinculoInicial}
      busca={<Busca key="busca" placeholder="Buscar tarefa, cliente ou projeto…" defaultValue={q} />}
      filtros={
        <Fragment key="filtros">
          <FiltroMenu param="categoria" rotulo="Categoria" opcoes={[{ valor: "", label: "Todas" }, ...(categorias ?? []).map((c) => ({ valor: c.nome, label: `${c.icone} ${c.nome}` }))]} />
          <FiltroMenu param="prioridade" rotulo="Prioridade" opcoes={[{ valor: "", label: "Todas" }, ...PRIORIDADES.map((p) => ({ valor: p, label: PRIORIDADE_LABEL[p], cor: PRIORIDADE_COR[p] }))]} />
        </Fragment>
      }
    />
  );
}
