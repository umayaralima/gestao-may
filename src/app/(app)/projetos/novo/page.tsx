import Link from "next/link";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { createClient } from "@/lib/supabase/server";
import { criarProjeto } from "../actions";
import { ProjetoForm } from "../projeto-form";

export default async function NovoProjetoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const supabase = await createClient();
  const [{ data: clientes }, { data: tipos }] = await Promise.all([
    supabase.from("clientes").select("id, nome, empresa").eq("status", "ativo").order("nome"),
    supabase.from("tipos_projeto").select("nome").order("ordem").order("nome"),
  ]);

  return (
    <div className="max-w-3xl">
      <PaginaHeader titulo="Novo projeto" />
      {!clientes?.length ? (
        <Vazio>
          Projeto sem cliente não existe.{" "}
          <Link href="/clientes/novo" className="text-rosa-700 underline">
            Cadastre um cliente primeiro
          </Link>
          .
        </Vazio>
      ) : (
        <ProjetoForm
          action={criarProjeto}
          clientes={clientes}
          tipos={(tipos ?? []).map((t) => t.nome)}
          clienteInicial={cliente}
          cancelarHref={cliente ? `/clientes/${cliente}` : "/projetos"}
        />
      )}
    </div>
  );
}
