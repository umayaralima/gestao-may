import { notFound } from "next/navigation";
import { PaginaHeader } from "@/components/ui/pagina";
import { createClient } from "@/lib/supabase/server";
import type { Projeto } from "@/lib/types";
import { atualizarProjeto } from "../../actions";
import { ProjetoForm } from "../../projeto-form";

export default async function EditarProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: projeto }, { data: clientes }] = await Promise.all([
    supabase.from("projetos").select("*").eq("id", id).single<Projeto>(),
    supabase.from("clientes").select("id, nome, empresa").order("nome"),
  ]);
  if (!projeto) notFound();

  const action = atualizarProjeto.bind(null, projeto.id);

  return (
    <div className="max-w-3xl">
      <PaginaHeader titulo="Editar projeto" descricao={projeto.nome} />
      <ProjetoForm action={action} clientes={clientes ?? []} projeto={projeto} cancelarHref={`/projetos/${projeto.id}`} />
    </div>
  );
}
