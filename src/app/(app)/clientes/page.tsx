import Link from "next/link";
import { BadgeCliente } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Input } from "@/components/ui/input";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("clientes").select("*").order("nome");
  if (q.trim()) {
    const termo = `%${q.trim()}%`;
    query = query.or(`nome.ilike.${termo},empresa.ilike.${termo}`);
  }
  const { data: clientes } = await query.returns<Cliente[]>();

  return (
    <>
      <PaginaHeader
        titulo="Clientes"
        descricao={`${clientes?.length ?? 0} cliente(s)`}
        acao={<Botao href="/clientes/novo">Novo cliente</Botao>}
      />

      <form className="mb-4 flex max-w-md gap-2">
        <Input name="q" placeholder="Buscar por nome ou empresa" defaultValue={q} />
        <Botao type="submit" variante="secundario">
          Buscar
        </Botao>
      </form>

      {!clientes?.length ? (
        <Vazio>{q ? "Nenhum cliente encontrado pra essa busca." : "Nenhum cliente ainda. Cadastre o primeiro."}</Vazio>
      ) : (
        <Tabela>
          <Thead>
            <tr>
              <Th>Nome</Th>
              <Th>Empresa</Th>
              <Th>Nicho</Th>
              <Th>WhatsApp</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {clientes.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <Link href={`/clientes/${c.id}`} className="font-medium text-rosa-300 hover:underline">
                    {c.nome}
                  </Link>
                </Td>
                <Td>{c.empresa ?? "—"}</Td>
                <Td>{c.nicho ?? "—"}</Td>
                <Td>{c.whatsapp ?? "—"}</Td>
                <Td>
                  <BadgeCliente status={c.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
