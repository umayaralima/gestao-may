import { PaginaHeader } from "@/components/ui/pagina";
import { createClient } from "@/lib/supabase/server";
import { criarLead } from "../actions";
import { LeadForm } from "../lead-form";

export default async function NovoLeadPage() {
  const supabase = await createClient();
  const { data: tipos } = await supabase.from("tipos_projeto").select("nome").order("ordem").order("nome");

  return (
    <div className="max-w-3xl">
      <PaginaHeader titulo="Novo lead" descricao="Alguém entrou em contato? Registra aqui antes que esfrie." />
      <LeadForm action={criarLead} tipos={(tipos ?? []).map((t) => t.nome)} cancelarHref="/leads" />
    </div>
  );
}
