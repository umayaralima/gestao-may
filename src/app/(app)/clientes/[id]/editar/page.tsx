import { notFound } from "next/navigation";
import { PaginaHeader } from "@/components/ui/pagina";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";
import { atualizarCliente } from "../../actions";
import { ClienteForm } from "../../cliente-form";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).single<Cliente>();
  if (!cliente) notFound();

  const action = atualizarCliente.bind(null, cliente.id);

  return (
    <div className="max-w-3xl">
      <PaginaHeader titulo="Editar cliente" descricao={cliente.nome} />
      <ClienteForm action={action} cliente={cliente} cancelarHref={`/clientes/${cliente.id}`} />
    </div>
  );
}
