import Link from "next/link";
import { BadgePagamento } from "@/components/ui/badge";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { cn } from "@/lib/cn";
import { TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Pagamento, StatusPagamento } from "@/lib/types";
import { desfazerPagamento, marcarComoPago } from "./actions";

type PagamentoCompleto = Pagamento & {
  projetos: { id: string; nome: string; clientes: { id: string; nome: string } | null } | null;
};

const filtros: Array<{ valor: "" | StatusPagamento; label: string }> = [
  { valor: "", label: "Em aberto" },
  { valor: "atrasado", label: "Atrasados" },
  { valor: "pendente", label: "Pendentes" },
  { valor: "pago", label: "Pagos" },
];

export default async function PagamentosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("pagamentos_view").select("*, projetos(id, nome, clientes(id, nome))");
  if (status === "") query = query.neq("status", "pago").order("vencimento");
  else query = query.eq("status", status).order("vencimento", { ascending: status !== "pago" });

  const { data: pagamentos } = await query.returns<PagamentoCompleto[]>();
  const lista = pagamentos ?? [];
  const total = lista.reduce((s, p) => s + Number(p.valor), 0);

  return (
    <>
      <PaginaHeader titulo="Pagamentos" descricao={`${lista.length} parcela(s) · ${formatBRL(total)}`} />

      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/pagamentos?status=${f.valor}` : "/pagamentos"}
            className={cn(
              "rounded-smaller border px-3 py-1 text-xs font-medium transition-colors",
              status === f.valor
                ? f.valor === "atrasado"
                  ? "border-falha bg-falha text-white"
                  : "border-rosa-600 bg-rosa-600 text-rosa-50"
                : "border-neutro-100 bg-branco text-neutro-700 hover:border-rosa-600 hover:text-rosa-800",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!lista.length ? (
        <Vazio>Nenhum pagamento nesse filtro.</Vazio>
      ) : (
        <Tabela>
          <Thead>
            <tr>
              <Th>Projeto</Th>
              <Th>Cliente</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Valor</Th>
              <Th>Vencimento</Th>
              <Th>Status</Th>
              <Th className="text-right">Ação</Th>
            </tr>
          </Thead>
          <tbody>
            {lista.map((p) => {
              const pagar = marcarComoPago.bind(null, p.id, p.projeto_id);
              const desfazer = desfazerPagamento.bind(null, p.id, p.projeto_id);
              return (
                <Tr key={p.id} destaque={p.status === "atrasado"}>
                  <Td>
                    <Link href={`/projetos/${p.projeto_id}?aba=pagamentos`} className="font-medium text-rosa-700 hover:underline">
                      {p.projetos?.nome ?? "—"}
                    </Link>
                  </Td>
                  <Td>{p.projetos?.clientes?.nome ?? "—"}</Td>
                  <Td>{p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : "—"}</Td>
                  <Td className="text-right font-medium">{formatBRL(p.valor)}</Td>
                  <Td className={p.status === "atrasado" ? "font-semibold text-falha" : ""}>{formatDate(p.vencimento)}</Td>
                  <Td>
                    <BadgePagamento status={p.status} />
                  </Td>
                  <Td className="text-right text-xs">
                    {p.status === "pago" ? (
                      <form action={desfazer}>
                        <button type="submit" className="text-neutro-500 underline underline-offset-4 hover:text-neutro-800">
                          Desfazer
                        </button>
                      </form>
                    ) : (
                      <form action={pagar}>
                        <button type="submit" className="font-medium text-sucesso underline underline-offset-4 hover:opacity-80">
                          Marcar pago
                        </button>
                      </form>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
