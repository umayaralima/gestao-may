import Link from "next/link";
import { BadgeProjeto } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { cn } from "@/lib/cn";
import { STATUS_PROJETO, STATUS_PROJETO_ATIVO, STATUS_PROJETO_LABEL, type StatusProjeto } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Projeto } from "@/lib/types";

type ProjetoComCliente = Projeto & { clientes: { nome: string } | null };

const filtros: Array<{ valor: string; label: string }> = [
  { valor: "", label: "Todos" },
  { valor: "ativos", label: "Ativos" },
  ...STATUS_PROJETO.map((s) => ({ valor: s, label: STATUS_PROJETO_LABEL[s] })),
];

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("projetos").select("*, clientes(nome)").order("criado_em", { ascending: false });
  if (status === "ativos") query = query.in("status", STATUS_PROJETO_ATIVO);
  else if ((STATUS_PROJETO as readonly string[]).includes(status)) query = query.eq("status", status as StatusProjeto);

  const { data: projetos } = await query.returns<ProjetoComCliente[]>();

  return (
    <>
      <PaginaHeader
        titulo="Projetos"
        descricao={`${projetos?.length ?? 0} projeto(s)`}
        acao={<Botao href="/projetos/novo">Novo projeto</Botao>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/projetos?status=${f.valor}` : "/projetos"}
            className={cn(
              "rounded-smaller border px-3 py-1 text-xs font-medium transition-colors",
              status === f.valor
                ? "border-rosa-600 bg-rosa-600 text-rosa-50"
                : "border-neutro-100 bg-branco text-neutro-700 hover:border-rosa-600 hover:text-rosa-800",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!projetos?.length ? (
        <Vazio>Nenhum projeto nesse filtro.</Vazio>
      ) : (
        <Tabela>
          <Thead>
            <tr>
              <Th>Projeto</Th>
              <Th>Cliente</Th>
              <Th>Tipo</Th>
              <Th>Status</Th>
              <Th className="text-right">Valor</Th>
              <Th>Prazo</Th>
            </tr>
          </Thead>
          <tbody>
            {projetos.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link href={`/projetos/${p.id}`} className="font-medium text-rosa-700 hover:underline">
                    {p.nome}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/clientes/${p.cliente_id}`} className="hover:underline">
                    {p.clientes?.nome ?? "—"}
                  </Link>
                </Td>
                <Td>{p.tipo ?? "—"}</Td>
                <Td>
                  <BadgeProjeto status={p.status} />
                </Td>
                <Td className="text-right">{formatBRL(p.valor_total)}</Td>
                <Td>{formatDate(p.prazo_entrega)}</Td>
              </Tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
