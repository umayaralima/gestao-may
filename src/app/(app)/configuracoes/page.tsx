import { Card, CardTitulo } from "@/components/ui/card";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { createClient } from "@/lib/supabase/server";
import type { TipoProjeto } from "@/lib/types";
import { excluirTipoProjeto, renomearTipoProjeto } from "./actions";
import { NovoTipoForm } from "./novo-tipo-form";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [{ data: tipos }, { data: emUso }] = await Promise.all([
    supabase.from("tipos_projeto").select("*").order("ordem").order("nome").returns<TipoProjeto[]>(),
    supabase.from("projetos").select("tipo").not("tipo", "is", null).returns<Array<{ tipo: string }>>(),
  ]);

  const contagem = new Map<string, number>();
  for (const p of emUso ?? []) contagem.set(p.tipo, (contagem.get(p.tipo) ?? 0) + 1);

  return (
    <div className="max-w-2xl">
      <PaginaHeader titulo="Configurações" descricao="Listas que aparecem nos formulários." />

      <Card>
        <CardTitulo>Tipos de serviço</CardTitulo>
        <p className="mb-4 text-sm text-neutro-500">
          Aparecem no campo &ldquo;Tipo de serviço&rdquo; do projeto. Renomear atualiza os projetos que já usam o nome;
          excluir não apaga projeto nenhum, eles só mantêm o texto antigo.
        </p>

        {!tipos?.length ? (
          <Vazio>Nenhum serviço cadastrado.</Vazio>
        ) : (
          <ul className="divide-y divide-neutro-0 rounded-medium border border-neutro-100">
            {tipos.map((t) => {
              const renomear = renomearTipoProjeto.bind(null, t.id);
              const excluir = excluirTipoProjeto.bind(null, t.id);
              const usos = contagem.get(t.nome) ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                  <form action={renomear} className="flex flex-1 items-center gap-2">
                    <input
                      name="nome"
                      defaultValue={t.nome}
                      maxLength={80}
                      className="w-full rounded-smaller border-2 border-transparent bg-transparent px-2 py-1 text-sm text-neutro-800 hover:border-neutro-100 focus:border-neutro-800 focus:outline-none"
                    />
                    <button type="submit" className="text-xs text-neutro-500 underline underline-offset-4 hover:text-neutro-800">
                      Salvar
                    </button>
                  </form>
                  <span className="w-20 text-right text-xs text-neutro-400">
                    {usos ? `${usos} projeto(s)` : ""}
                  </span>
                  <form action={excluir}>
                    <button type="submit" className="text-xs text-falha underline underline-offset-4 hover:opacity-80">
                      Excluir
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <NovoTipoForm />
        </div>
      </Card>
    </div>
  );
}
