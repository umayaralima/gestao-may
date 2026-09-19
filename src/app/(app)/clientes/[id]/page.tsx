import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCliente, BadgeProjeto } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Card, CardTitulo } from "@/components/ui/card";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import { formatBRL, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Interacao, Projeto } from "@/lib/types";
import { excluirCliente } from "../actions";
import {
  adiarFollowup,
  concluirFollowup,
  excluirInteracao,
  registrarInteracao,
  salvarFollowup,
  type Dono,
} from "../../crm/actions";
import { PainelRelacionamento } from "../../crm/painel-relacionamento";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: projetos }, { data: interacoes }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single<Cliente>(),
    supabase.from("projetos").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).returns<Projeto[]>(),
    supabase.from("interacoes").select("*").eq("cliente_id", id).order("data", { ascending: false }).order("criado_em", { ascending: false }).returns<Interacao[]>(),
  ]);

  if (!cliente) notFound();

  const excluir = excluirCliente.bind(null, cliente.id);
  const dono: Dono = { tipo: "cliente", id: cliente.id };
  const acoes = {
    registrarInteracao: registrarInteracao.bind(null, dono),
    excluirInteracao: excluirInteracao.bind(null, dono),
    salvarFollowup: salvarFollowup.bind(null, dono),
    concluirFollowup: concluirFollowup.bind(null, dono),
    adiarFollowup: adiarFollowup.bind(null, dono),
  };

  const info: Array<[string, React.ReactNode]> = [
    ["Empresa", cliente.empresa],
    ["Nicho", cliente.nicho],
    ["E-mail", cliente.email],
    ["WhatsApp", cliente.whatsapp],
    ["Origem", cliente.origem ? ORIGEM_CLIENTE_LABEL[cliente.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? cliente.origem : null],
    ["Cliente desde", formatDate(cliente.criado_em)],
    ["Veio de", cliente.lead_id ? <Link href={`/leads/${cliente.lead_id}`} className="text-rosa-300 hover:underline">lead convertido</Link> : "cadastro direto"],
  ];

  return (
    <>
      <PaginaHeader
        titulo={cliente.nome}
        descricao={cliente.empresa ?? undefined}
        acao={
          <div className="flex items-center gap-3">
            <BadgeCliente status={cliente.status} />
            <Botao href={`/clientes/${cliente.id}/editar`} variante="secundario">
              Editar
            </Botao>
            <Botao href={`/projetos/novo?cliente=${cliente.id}`}>Novo projeto</Botao>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardTitulo>Dados</CardTitulo>
            <dl className="space-y-3 text-sm">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt className="rotulo">{k}</dt>
                  <dd className="text-texto-suave">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {cliente.observacoes && (
              <>
                <dt className="mt-4 rotulo">Observações</dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap text-texto-suave">{cliente.observacoes}</dd>
              </>
            )}
          </Card>

          <form action={excluir}>
            <Botao type="submit" variante="perigo" className="w-full">
              Excluir cliente
            </Botao>
            <p className="mt-2 text-xs text-texto-mudo">Exclui também todos os projetos e pagamentos dele.</p>
          </form>
        </div>

        <div>
          <h2 className="mb-3 text-2xl">Projetos</h2>
          {!projetos?.length ? (
            <Vazio>
              Nenhum projeto ainda.{" "}
              <Link href={`/projetos/novo?cliente=${cliente.id}`} className="text-rosa-300 underline">
                Criar o primeiro
              </Link>
            </Vazio>
          ) : (
            <Tabela>
              <Thead>
                <tr>
                  <Th>Projeto</Th>
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
                      <Link href={`/projetos/${p.id}`} className="font-medium text-rosa-300 hover:underline">
                        {p.nome}
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

          <h2 className="mt-8 mb-3 text-2xl">Relacionamento</h2>
          <PainelRelacionamento
            dono={dono}
            followup={{ data: cliente.proximo_followup, nota: cliente.nota_followup }}
            interacoes={interacoes ?? []}
            acoes={acoes}
          />
        </div>
      </div>
    </>
  );
}
