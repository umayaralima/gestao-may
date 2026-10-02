"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { fmtRelativo } from "@/lib/format";
import { trocarTokenLeads } from "./actions";

export type EntradaLead = { id: string; origem: string; erro: string | null; criado_em: string; lead_id: string | null };

/*
 * Aba Integrações: endereço e token da API pública de leads (formulário do site, ManyChat)
 * e as últimas chamadas recebidas, pra conferir se a integração está entrando.
 */
export function Integracoes({ urlLeads, ultimas }: { urlLeads: string | null; ultimas: EntradaLead[] }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [trocando, trocar] = useTransition();

  const copiar = async (texto: string, qual: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  };

  if (!urlLeads) {
    return (
      <div className="space-y-5 entrar">
        <Titulo />
        <Secao titulo="Entrada de leads">
          <p className="px-6 py-6 text-xs text-[#968F88]">Rode a migração 013_permuta_e_leads.sql no Supabase pra liberar o endereço.</p>
        </Secao>
      </div>
    );
  }

  return (
    <div className="space-y-5 entrar">
      <Titulo />

      <Secao titulo="Entrada de leads" sub="Qualquer formulário ou chatbot pode criar um negócio no Pipeline chamando este endereço. O contato cai em Prospecção, com follow-up pra hoje, e você recebe um e-mail na hora.">
        <div className="px-6 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-1.5">Endereço (POST)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={urlLeads}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-[#1B0F26] border border-[#311C45] rounded-lg px-3 py-2 text-xs font-mono text-[#C5C2BE] outline-none focus:border-brand-400/60"
              />
              <button type="button" onClick={() => copiar(urlLeads, "url")} className="px-3 py-2 text-xs text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors whitespace-nowrap">
                {copiado === "url" ? "Copiado ✓" : "Copiar"}
              </button>
            </div>
            <p className="text-[11px] text-[#5A496A] mt-1.5">É um endereço secreto: quem tiver ele consegue criar negócios no seu pipeline.</p>
          </div>

          <details className="rounded-lg border border-[#311C45] bg-[#150C1D] px-4 py-3">
            <summary className="text-xs text-brand-400 cursor-pointer">Como ligar no formulário do site (Elementor)</summary>
            <ol className="mt-3 space-y-2 text-[11px] text-[#C5C2BE] leading-relaxed list-decimal pl-4">
              <li>Edite o formulário no Elementor e abra <strong>Ações após enviar</strong>.</li>
              <li>Adicione a ação <strong>Webhook</strong>.</li>
              <li>Em <strong>Webhook</strong> → <strong>URL</strong>, cole o endereço acima.</li>
              <li>
                Nos campos do formulário, use estes <em>IDs</em>: <code className="text-brand-400">nome</code>, <code className="text-brand-400">email</code>,{" "}
                <code className="text-brand-400">whatsapp</code>, <code className="text-brand-400">mensagem</code> e, se tiver, <code className="text-brand-400">servico</code> e{" "}
                <code className="text-brand-400">empresa</code>.
              </li>
              <li>Opcional: um campo escondido <code className="text-brand-400">origem</code> com o valor <code>site</code>.</li>
              <li>Publique e mande um teste pelo próprio site.</li>
            </ol>
          </details>

          <details className="rounded-lg border border-[#311C45] bg-[#150C1D] px-4 py-3">
            <summary className="text-xs text-brand-400 cursor-pointer">Como ligar no ManyChat (Instagram)</summary>
            <ol className="mt-3 space-y-2 text-[11px] text-[#C5C2BE] leading-relaxed list-decimal pl-4">
              <li>No fluxo que captura o contato, adicione o passo <strong>External Request</strong> (precisa do ManyChat Pro).</li>
              <li>Método <strong>POST</strong>, URL: o endereço acima.</li>
              <li>Content type <strong>application/json</strong> e, no corpo, use os campos do ManyChat:</li>
            </ol>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-[#1B0F26] p-3 text-[10px] font-mono text-[#968F88] leading-relaxed">{`{
  "nome": "{{first_name}} {{last_name}}",
  "instagram": "{{ig_username}}",
  "whatsapp": "{{phone}}",
  "email": "{{email}}",
  "mensagem": "{{last_input_text}}",
  "origem": "instagram"
}`}</pre>
            <p className="mt-2 text-[11px] text-[#5A496A]">Use só as variáveis que o seu fluxo realmente coleta — nome e um contato bastam.</p>
          </details>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={trocando}
              onClick={() => confirm("Gerar novo endereço? O atual para de funcionar e você precisa atualizar o site e o ManyChat.") && trocar(() => trocarTokenLeads())}
              className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {trocando ? "Gerando…" : "Gerar novo endereço"}
            </button>
          </div>
        </div>
      </Secao>

      <Secao titulo="Últimos contatos recebidos" sub="Serve pra conferir se a integração está entrando.">
        {ultimas.length === 0 ? (
          <p className="px-6 py-6 text-xs text-[#968F88]">Nenhum contato pela API ainda.</p>
        ) : (
          <ul className="divide-y divide-[#311C45]/60">
            {ultimas.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className={cn("text-xs", e.erro ? "text-red-400" : "text-[#DDDBD9]")}>{e.erro ? `Falhou: ${e.erro}` : e.lead_id ? "Negócio criado no pipeline" : "Recebido"}</p>
                  <p className="text-[10px] text-[#968F88]">via {e.origem}</p>
                </div>
                <span className="text-[10px] font-mono text-[#968F88] whitespace-nowrap">{fmtRelativo(e.criado_em)}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

function Titulo() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#F5F5F4] mb-0.5">Integrações</h2>
      <p className="text-xs text-[#968F88]">Entrada automática de contatos no Pipeline</p>
    </div>
  );
}

function Secao({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#231431] border border-[#311C45] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#311C45]">
        <p className="text-sm font-semibold text-[#F5F5F4]">{titulo}</p>
        {sub && <p className="text-xs text-[#968F88] mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
