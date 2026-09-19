import { BadgePagamento } from "@/components/ui/badge";
import { Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { FORMA_PAGAMENTO_LABEL, TIPO_PAGAMENTO_LABEL } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import type { Pagamento } from "@/lib/types";
import { desfazerPagamento, excluirPagamento, marcarComoPago } from "./actions";

/** Lista de parcelas de um projeto, com ações inline (marcar pago, desfazer, excluir). */
export function ListaPagamentos({ pagamentos }: { pagamentos: Pagamento[] }) {
  if (!pagamentos.length) return <Vazio>Nenhuma parcela cadastrada ainda.</Vazio>;

  return (
    <Tabela>
      <Thead>
        <tr>
          <Th>Tipo</Th>
          <Th className="text-right">Valor</Th>
          <Th>Vencimento</Th>
          <Th>Forma</Th>
          <Th>Status</Th>
          <Th>Pago em</Th>
          <Th className="text-right">Ações</Th>
        </tr>
      </Thead>
      <tbody>
        {pagamentos.map((p) => {
          const pagar = marcarComoPago.bind(null, p.id, p.projeto_id);
          const desfazer = desfazerPagamento.bind(null, p.id, p.projeto_id);
          const excluir = excluirPagamento.bind(null, p.id, p.projeto_id);
          return (
            <Tr key={p.id} destaque={p.status === "atrasado"}>
              <Td>{p.tipo ? TIPO_PAGAMENTO_LABEL[p.tipo] : "—"}</Td>
              <Td className="text-right font-medium">{formatBRL(p.valor)}</Td>
              <Td className={p.status === "atrasado" ? "font-semibold text-falha" : ""}>{formatDate(p.vencimento)}</Td>
              <Td>{p.forma_pagamento ? FORMA_PAGAMENTO_LABEL[p.forma_pagamento as keyof typeof FORMA_PAGAMENTO_LABEL] ?? p.forma_pagamento : "—"}</Td>
              <Td>
                <BadgePagamento status={p.status} />
              </Td>
              <Td>{formatDate(p.data_pagamento)}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-3 text-xs">
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
                  <form action={excluir}>
                    <button type="submit" className="text-falha underline underline-offset-4 hover:opacity-80">
                      Excluir
                    </button>
                  </form>
                </div>
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}
