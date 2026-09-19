import { notFound } from "next/navigation";
import { PaginaHeader } from "@/components/ui/pagina";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";
import { atualizarLead } from "../../actions";
import { LeadForm } from "../../lead-form";

export default async function EditarLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: lead }, { data: tipos }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single<Lead>(),
    supabase.from("tipos_projeto").select("nome").order("ordem").order("nome"),
  ]);
  if (!lead) notFound();

  const action = atualizarLead.bind(null, lead.id);

  return (
    <div className="max-w-3xl">
      <PaginaHeader titulo="Editar lead" descricao={lead.nome} />
      <LeadForm action={action} tipos={(tipos ?? []).map((t) => t.nome)} lead={lead} cancelarHref={`/leads/${lead.id}`} />
    </div>
  );
}
