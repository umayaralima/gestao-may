import Link from "next/link";
import { Botao } from "@/components/ui/botao";
import { PaginaHeader, Vazio } from "@/components/ui/pagina";
import { Tabela, Td, Th, Thead, Tr } from "@/components/ui/tabela";
import { cn } from "@/lib/cn";
import { ETAPAS_LEAD_ABERTAS, ETAPA_LEAD_LABEL, ORIGEM_CLIENTE_LABEL } from "@/lib/constantes";
import { BadgeEtapa, FollowupTag } from "./badge-etapa";
import { formatBRL, hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ ver?: string; filtro?: string }> }) {
  const { ver = "funil", filtro = "" } = await searchParams;
  const supabase = await createClient();
  const hoje = hojeISO();

  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("proximo_followup", { ascending: true, nullsFirst: false })
    .order("atualizado_em", { ascending: false })
    .returns<Lead[]>();
  const leads = data ?? [];

  const abertos = leads.filter((l) => (ETAPAS_LEAD_ABERTAS as string[]).includes(l.etapa));
  const fechados = leads.filter((l) => !(ETAPAS_LEAD_ABERTAS as string[]).includes(l.etapa));
  const comFollowupVencido = abertos.filter((l) => l.proximo_followup && l.proximo_followup <= hoje);
  const pipeline = abertos.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0);

  return (
    <>
      <PaginaHeader
        titulo="Leads"
        descricao={`${abertos.length} em aberto · ${formatBRL(pipeline)} no funil${comFollowupVencido.length ? ` · ${comFollowupVencido.length} follow-up(s) pra hoje ou atrasado(s)` : ""}`}
        acao={<Botao href="/leads/novo">Novo lead</Botao>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/leads" className={cn(chip, ver === "funil" && !filtro ? chipAtivo : chipInativo)}>
          Funil
        </Link>
        <Link href="/leads?ver=lista" className={cn(chip, ver === "lista" && !filtro ? chipAtivo : chipInativo)}>
          Lista
        </Link>
        <Link
          href="/leads?ver=lista&filtro=followup"
          className={cn(chip, filtro === "followup" ? "border-falha bg-falha text-white" : chipInativo)}
        >
          Follow-ups pendentes {comFollowupVencido.length > 0 && `(${comFollowupVencido.length})`}
        </Link>
      </div>

      {leads.length === 0 ? (
        <Vazio>Nenhum lead ainda. Cadastre quem entrou em contato com você.</Vazio>
      ) : ver === "lista" || filtro ? (
        <ListaLeads leads={filtro === "followup" ? comFollowupVencido : leads} />
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
            <div className="grid min-w-[880px] grid-cols-4 gap-4">
              {ETAPAS_LEAD_ABERTAS.map((etapa) => {
                const coluna = abertos.filter((l) => l.etapa === etapa);
                const total = coluna.reduce((s, l) => s + Number(l.valor_estimado ?? 0), 0);
                return (
                  <section key={etapa} className="rounded-medium bg-lavanda-50/60 p-3">
                    <header className="mb-3 flex items-baseline justify-between px-1">
                      <h2 className="font-sans text-sm font-semibold not-italic text-neutro-800">
                        {ETAPA_LEAD_LABEL[etapa]} <span className="font-normal text-neutro-500">({coluna.length})</span>
                      </h2>
                      {total > 0 && <span className="text-xs text-neutro-500">{formatBRL(total)}</span>}
                    </header>
                    <div className="space-y-2">
                      {coluna.length === 0 && <p className="px-1 py-4 text-center text-xs text-neutro-400">vazio</p>}
                      {coluna.map((l) => (
                        <Link
                          key={l.id}
                          href={`/leads/${l.id}`}
                          className={cn(
                            "block rounded-medium bg-branco p-3 shadow-padrao transition-transform hover:-translate-y-0.5",
                            l.proximo_followup && l.proximo_followup < hoje && "ring-2 ring-falha",
                          )}
                        >
                          <p className="font-medium text-neutro-900">{l.nome}</p>
                          {l.empresa && <p className="text-xs text-neutro-500">{l.empresa}</p>}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                            <span className="text-neutro-600">{l.servico_interesse ?? "—"}</span>
                            {l.valor_estimado !== null && <span className="font-medium text-neutro-800">{formatBRL(l.valor_estimado)}</span>}
                          </div>
                          <div className="mt-2">
                            <FollowupTag data={l.proximo_followup} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {fechados.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-neutro-500 hover:text-neutro-800">
                Fechados ({fechados.length}): ganhos e perdidos
              </summary>
              <div className="mt-3">
                <ListaLeads leads={fechados} />
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}

const chip = "rounded-smaller border px-3 py-1 text-xs font-medium transition-colors";
const chipAtivo = "border-rosa-600 bg-rosa-600 text-rosa-50";
const chipInativo = "border-neutro-100 bg-branco text-neutro-700 hover:border-rosa-600 hover:text-rosa-800";

function ListaLeads({ leads }: { leads: Lead[] }) {
  if (!leads.length) return <Vazio>Nada por aqui.</Vazio>;
  const hoje = hojeISO();
  return (
    <Tabela>
      <Thead>
        <tr>
          <Th>Lead</Th>
          <Th>Etapa</Th>
          <Th>Serviço</Th>
          <Th>Origem</Th>
          <Th className="text-right">Estimado</Th>
          <Th>Follow-up</Th>
        </tr>
      </Thead>
      <tbody>
        {leads.map((l) => (
          <Tr key={l.id} destaque={!!l.proximo_followup && l.proximo_followup < hoje && (ETAPAS_LEAD_ABERTAS as string[]).includes(l.etapa)}>
            <Td>
              <Link href={`/leads/${l.id}`} className="font-medium text-rosa-700 hover:underline">
                {l.nome}
              </Link>
              {l.empresa && <span className="block text-xs text-neutro-500">{l.empresa}</span>}
            </Td>
            <Td>
              <BadgeEtapa etapa={l.etapa} />
            </Td>
            <Td>{l.servico_interesse ?? "—"}</Td>
            <Td>{l.origem ? ORIGEM_CLIENTE_LABEL[l.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? l.origem : "—"}</Td>
            <Td className="text-right">{formatBRL(l.valor_estimado)}</Td>
            <Td>
              <FollowupTag data={l.proximo_followup} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </Tabela>
  );
}
