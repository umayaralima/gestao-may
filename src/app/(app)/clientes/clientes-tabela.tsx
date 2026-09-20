"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Avatar, BotaoLinha, BotaoPrimario, Header, Pill, Th, Vazio } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { CANAL_INTERACAO_LABEL, ORIGEM_CLIENTE_LABEL, STATUS_PROJETO_LABEL } from "@/lib/constantes";
import { fmt, fmtData } from "@/lib/format";
import type { Cliente, Contrato, Interacao, Projeto } from "@/lib/types";
import { criarCliente, excluirClientes } from "./actions";
import { BadgeStatusCliente } from "./badge-cliente";
import { ClienteFormModal } from "./cliente-form";

export type ClienteLinha = {
  cliente: Cliente;
  valor: number;
  negocios: number;
  ultimoContato: string | null;
  projetos: Projeto[];
  interacoes: Interacao[];
  contratos: Array<Contrato & { projeto_nome: string }>;
};

type Props = {
  linhas: ClienteLinha[];
  abrirNovo?: boolean;
  sub: React.ReactNode;
  busca: React.ReactNode;
  subbar: React.ReactNode;
};

/** Tela Clientes do protótipo: tabela com seleção + painel lateral de detalhes. */
export function ClientesTabela({ linhas, abrirNovo, sub, busca, subbar }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(!!abrirNovo);
  const [pending, startTransition] = useTransition();

  const fecharNovo = useCallback(() => {
    setNovo(false);
    if (abrirNovo) router.replace(pathname);
  }, [abrirNovo, router, pathname]);

  const toggle = (id: string) =>
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleTodos = () => setSelecionados((prev) => (prev.size === linhas.length ? new Set() : new Set(linhas.map((l) => l.cliente.id))));

  const excluirSelecionados = () => {
    if (!confirm(`Excluir ${selecionados.size} cliente(s)? Isso apaga também os projetos e pagamentos deles.`)) return;
    startTransition(async () => {
      await excluirClientes([...selecionados]);
      setSelecionados(new Set());
      setAberto(null);
    });
  };

  const linhaAberta = linhas.find((l) => l.cliente.id === aberto) ?? null;

  return (
    <>
      {novo && <ClienteFormModal action={criarCliente} onClose={fecharNovo} />}
      <div className="flex h-full overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header titulo="Clientes" sub={sub}>
            {busca}
            {selecionados.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-brand-400/10 border border-brand-400/20 rounded-lg">
                <span className="text-xs text-brand-400 font-medium">{selecionados.size} selecionados</span>
                <button type="button" onClick={excluirSelecionados} disabled={pending} className="text-[11px] text-[#968F88] hover:text-red-400 transition-colors ml-1">
                  {pending ? "Excluindo…" : "Excluir"}
                </button>
              </div>
            )}
            <BotaoPrimario onClick={() => setNovo(true)}>Novo cliente</BotaoPrimario>
          </Header>

          {subbar}

          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-[#150C1D] z-10">
                <tr className="border-b border-[#311C45]">
                  <th className="pl-5 pr-3 py-3">
                    <input
                      type="checkbox"
                      checked={selecionados.size === linhas.length && linhas.length > 0}
                      onChange={toggleTodos}
                      className="w-3.5 h-3.5 rounded border-[#5A496A] accent-brand-400 cursor-pointer"
                    />
                  </th>
                  {["Cliente", "Contato", "Status", "Valor", "Proj.", "Últ. contato", ""].map((h) => (
                    <Th key={h} className="px-3">
                      {h}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const c = l.cliente;
                  const sel = selecionados.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setAberto((prev) => (prev === c.id ? null : c.id))}
                      className={cn("border-b border-[#311C45]/60 hover:bg-white/[0.02] transition-colors cursor-pointer", sel && "bg-brand-400/5", aberto === c.id && "bg-brand-400/5")}
                    >
                      <td className="pl-5 pr-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggle(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-[#5A496A] accent-brand-400 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar nome={c.empresa ?? c.nome} />
                          <div>
                            <p className="text-xs font-semibold text-[#DDDBD9]">{c.empresa ?? c.nome}</p>
                            <p className="text-[10px] text-[#968F88]">
                              {[c.nicho, c.origem ? ORIGEM_CLIENTE_LABEL[c.origem as keyof typeof ORIGEM_CLIENTE_LABEL] : null].filter(Boolean).join(" · ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-xs text-[#C5C2BE]">{c.empresa ? c.nome : c.whatsapp ?? "—"}</p>
                        <p className="text-[10px] text-[#968F88] font-mono">{c.email ?? c.whatsapp ?? ""}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <BadgeStatusCliente status={c.status} />
                      </td>
                      <td className="px-3 py-3.5 text-xs font-mono text-[#DDDBD9]">{fmt(l.valor)}</td>
                      <td className="px-3 py-3.5 text-xs font-mono text-[#968F88] text-center">{l.negocios}</td>
                      <td className="px-3 py-3.5 text-[11px] font-mono text-[#968F88]">{l.ultimoContato ? fmtData(l.ultimoContato) : "—"}</td>
                      <td className="px-3 pr-5 py-3.5">
                        <BotaoLinha
                          onClick={(e) => {
                            e.stopPropagation();
                            setAberto(c.id);
                          }}
                        >
                          Abrir
                        </BotaoLinha>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {linhas.length === 0 && <Vazio titulo="Nenhum cliente encontrado" sub="Tente ajustar os filtros ou a busca" />}
          </div>
        </div>

        {linhaAberta && <PainelDetalhe linha={linhaAberta} onClose={() => setAberto(null)} />}
      </div>
    </>
  );
}

const ABAS = ["Visão geral", "Projetos", "Atividade", "Contratos"] as const;

function PainelDetalhe({ linha, onClose }: { linha: ClienteLinha; onClose: () => void }) {
  const [aba, setAba] = useState(0);
  const c = linha.cliente;
  const recebido = 0; // detalhado na página do cliente
  void recebido;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm shadow-2xl lg:static lg:z-auto lg:w-80 lg:max-w-none lg:shadow-none shrink-0 border-l border-[#311C45] flex flex-col bg-[#1B0F26] overflow-hidden entrar">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#311C45]">
        <p className="text-xs font-semibold text-[#968F88] uppercase tracking-wider">Detalhes</p>
        <button type="button" onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/8 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-5 border-b border-[#311C45]">
        <div className="flex items-center gap-3 mb-4">
          <Avatar nome={c.empresa ?? c.nome} tamanho={11} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F5F5F4] truncate">{c.empresa ?? c.nome}</p>
            <BadgeStatusCliente status={c.status} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Valor total", value: fmt(linha.valor) },
            { label: "Projetos", value: String(linha.negocios) },
            { label: "Interações", value: String(linha.interacoes.length) },
          ].map((s) => (
            <div key={s.label} className="bg-[#231431] rounded-lg p-2.5 text-center">
              <p className="text-xs font-mono font-semibold text-[#DDDBD9] truncate">{s.value}</p>
              <p className="text-[9px] text-[#968F88] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-[#311C45] px-2 pt-2">
        {ABAS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(i)}
            className={cn(
              "px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px",
              aba === i ? "border-brand-400 text-brand-400" : "border-transparent text-[#968F88] hover:text-[#DDDBD9]",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {aba === 0 && (
          <div className="px-5 py-4 space-y-4">
            <Secao titulo="Contato">
              <InfoRow icone={<PersonIcon />} valor={c.nome} />
              {c.email && <InfoRow icone={<MailIcon />} valor={c.email} mono />}
              {c.whatsapp && <InfoRow icone={<PhoneIcon />} valor={c.whatsapp} mono />}
            </Secao>
            <Divisor />
            <Secao titulo="Empresa">
              <InfoRow icone={<BuildingIcon />} valor={c.nicho ?? "Nicho não informado"} />
              <InfoRow icone={<PinIcon />} valor={c.origem ? `Veio via ${ORIGEM_CLIENTE_LABEL[c.origem as keyof typeof ORIGEM_CLIENTE_LABEL] ?? c.origem}` : "Origem não informada"} />
              <InfoRow icone={<CalIcon />} valor={`Cliente desde ${fmtData(c.criado_em)}`} />
            </Secao>
            {c.observacoes && (
              <>
                <Divisor />
                <Secao titulo="Observações">
                  <p className="text-[11px] text-[#C5C2BE] leading-relaxed whitespace-pre-wrap">{c.observacoes}</p>
                </Secao>
              </>
            )}
            <Divisor />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "WhatsApp", icone: "💬", href: c.whatsapp ? `https://wa.me/55${c.whatsapp.replace(/\D/g, "")}` : undefined, externo: true },
                { label: "E-mail", icone: "✉️", href: c.email ? `mailto:${c.email}` : undefined, externo: true },
                { label: "Projeto", icone: "📁", href: `/projetos?novo=1&cliente=${c.id}` },
                { label: "Tarefa", icone: "✅", href: `/tarefas?nova=1&cliente=${c.id}` },
              ].map((a) =>
                a.href ? (
                  <Link
                    key={a.label}
                    href={a.href}
                    target={a.externo ? "_blank" : undefined}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#231431] border border-[#311C45] hover:border-[#5A496A] rounded-lg text-[11px] text-[#C5C2BE] hover:text-[#DDDBD9] transition-colors"
                  >
                    <span>{a.icone}</span> {a.label}
                  </Link>
                ) : (
                  <span key={a.label} className="flex items-center justify-center gap-1.5 py-2 bg-[#231431] border border-[#311C45] rounded-lg text-[11px] text-[#5A496A]">
                    <span>{a.icone}</span> {a.label}
                  </span>
                ),
              )}
            </div>
            <Link href={`/clientes/${c.id}`} className="block w-full text-center py-2 bg-brand-400 hover:bg-brand-300 text-white text-xs font-semibold rounded-lg transition-colors">
              Abrir página completa
            </Link>
          </div>
        )}

        {aba === 1 && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-3">Projetos</p>
            {linha.projetos.length ? (
              <div className="space-y-2">
                {linha.projetos.map((p) => (
                  <Link key={p.id} href={`/projetos/${p.id}`} className="block bg-[#231431] border border-[#311C45] hover:border-[#5A496A] rounded-lg p-3 transition-colors">
                    <div className="flex items-start justify-between mb-1.5 gap-2">
                      <span className="text-xs font-medium text-[#DDDBD9]">{p.nome}</span>
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">{fmt(p.valor_total)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", p.status === "cancelado" ? "bg-[#968F88]" : p.status === "concluido" ? "bg-emerald-400" : "bg-brand-300")} />
                      <span className="text-[10px] text-[#968F88]">
                        {STATUS_PROJETO_LABEL[p.status]}
                        {p.tipo && ` · ${p.tipo}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#968F88] text-center py-8">Nenhum projeto ainda</p>
            )}
          </div>
        )}

        {aba === 2 && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-3">Histórico</p>
            {linha.interacoes.length ? (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-[#311C45]" />
                <div className="space-y-4 pl-8">
                  {linha.interacoes.slice(0, 20).map((t) => (
                    <div key={t.id} className="relative">
                      <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-[#311C45] border border-[#5A496A] flex items-center justify-center text-[10px]">
                        {{ whatsapp: "💬", email: "✉️", instagram: "📸", ligacao: "📞", reuniao: "📅" }[t.canal ?? ""] ?? "📝"}
                      </div>
                      <p className="text-xs font-medium text-[#DDDBD9]">{t.canal ? CANAL_INTERACAO_LABEL[t.canal as keyof typeof CANAL_INTERACAO_LABEL] ?? t.canal : "Interação"}</p>
                      <p className="text-[10px] font-mono text-[#968F88] mt-0.5">{fmtData(t.data)}</p>
                      <p className="text-[10px] text-[#968F88] mt-1 leading-relaxed">{t.resumo}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#968F88] text-center py-8">Nenhuma interação registrada</p>
            )}
          </div>
        )}

        {aba === 3 && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-3">Contratos</p>
            {linha.contratos.length ? (
              linha.contratos.map((k) => (
                <div key={k.id} className="flex items-center gap-3 py-2.5 border-b border-[#311C45]/60 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-[#311C45] flex items-center justify-center text-[10px] font-bold text-[#968F88] shrink-0">DOC</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#DDDBD9] truncate">{k.projeto_nome}</p>
                    <p className="text-[10px] text-[#968F88] font-mono">
                      {k.status === "assinado" ? `Assinado ${fmtData(k.data_assinatura, false)}` : k.status === "enviado" ? `Enviado ${fmtData(k.data_envio, false)}` : "Rascunho"}
                    </p>
                  </div>
                  {k.status === "assinado" ? <Pill tom="success" dot={false}>OK</Pill> : k.status === "enviado" ? <Pill tom="warning" dot={false}>Aguardando</Pill> : <Pill tom="muted" dot={false}>Rascunho</Pill>}
                  {k.link_documento && (
                    <a href={k.link_documento} target="_blank" rel="noreferrer" className="text-[#968F88] hover:text-brand-400 transition-colors" title="Abrir documento">
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M6.5 2v7M3.5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M1.5 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-[#968F88] text-center py-8">Nenhum contrato</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#968F88] uppercase tracking-wider mb-2">{titulo}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
function Divisor() {
  return <div className="h-px bg-[#311C45]" />;
}
function InfoRow({ icone, valor, mono }: { icone: React.ReactNode; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[#968F88] shrink-0">{icone}</span>
      <span className={cn("text-xs text-[#C5C2BE] truncate", mono && "font-mono text-[11px]")}>{valor}</span>
    </div>
  );
}

/* Ícones 12px do painel (protótipo) */
function PersonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 11c0-2.21 2.01-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="3" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 4.5l5 3.5 5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 2h3l1 3-1.5 1A7 7 0 0 0 7.5 8.5L9 7l3 1v3a1 1 0 0 1-1 1C4.5 12 0 7.5 0 2a1 1 0 0 1 1-1h1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="4" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 11V8h4v3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 1h4v3H4V1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1a4 4 0 0 1 4 4c0 2.5-4 7-4 7S2 7.5 2 5a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
