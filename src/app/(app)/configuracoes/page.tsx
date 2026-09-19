import { Card, CardTitulo, Header, Vazio } from "@/components/ui/primitivos";
import { createClient } from "@/lib/supabase/server";
import type { TipoProjeto } from "@/lib/types";
import { excluirTipoProjeto, renomearTipoProjeto } from "./actions";
import { NovoTipoForm } from "./novo-tipo-form";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [{ data: tipos }, { data: emUso }, { data: leadsUso }] = await Promise.all([
    supabase.from("tipos_projeto").select("*").order("ordem").order("nome").returns<TipoProjeto[]>(),
    supabase.from("projetos").select("tipo").not("tipo", "is", null).returns<Array<{ tipo: string }>>(),
    supabase.from("leads").select("servico_interesse").not("servico_interesse", "is", null).returns<Array<{ servico_interesse: string }>>(),
  ]);

  const contagem = new Map<string, number>();
  for (const p of emUso ?? []) contagem.set(p.tipo, (contagem.get(p.tipo) ?? 0) + 1);
  for (const l of leadsUso ?? []) contagem.set(l.servico_interesse, (contagem.get(l.servico_interesse) ?? 0) + 1);

  return (
    <>
      <Header titulo="Configurações" sub="Listas que aparecem nos formulários" />
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl space-y-5">
          <Card className="entrar">
            <CardTitulo sub="Aparecem no campo “Tipo de serviço” do projeto e no “Serviço de interesse” do pipeline. Renomear atualiza os registros que já usam o nome; excluir não apaga nada, eles só mantêm o texto antigo.">
              Tipos de serviço
            </CardTitulo>

            <div className="mt-4">
              {!tipos?.length ? (
                <Vazio icone="🧩" titulo="Nenhum serviço cadastrado" />
              ) : (
                <ul className="divide-y divide-[#311C45]/60 rounded-xl border border-[#311C45]">
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
                            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs text-[#DDDBD9] hover:border-[#311C45] focus:border-brand-400/60 focus:bg-[#150C1D] focus:outline-none transition-colors"
                          />
                          <button type="submit" className="px-2.5 py-1 text-[11px] text-[#968F88] hover:text-[#DDDBD9] border border-[#311C45] hover:border-[#5A496A] rounded-lg transition-colors">
                            Salvar
                          </button>
                        </form>
                        <span className="w-24 text-right text-[10px] font-mono text-[#968F88]">{usos ? `${usos} em uso` : ""}</span>
                        <form action={excluir}>
                          <button type="submit" className="px-2.5 py-1 text-[11px] text-[#968F88] hover:text-red-400 border border-[#311C45] hover:border-red-500/30 rounded-lg transition-colors">
                            Excluir
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <NovoTipoForm />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
