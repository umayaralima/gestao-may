"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { BotaoPrimario, Header, Subbar, Vazio } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { CATEGORIA_TAREFA_ICONE, CATEGORIA_TAREFA_LABEL, PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/lib/constantes";
import { diffDias, fmtData, hojeISO, rotuloDia, somarDias, toISODate } from "@/lib/format";
import type { Tarefa } from "@/lib/types";
import { alternarTarefa, atualizarTarefa, criarTarefa, excluirTarefa } from "./actions";
import { TarefaFormModal } from "./tarefa-form";

export type TarefaComVinculo = Tarefa & { vinculoNome: string | null; vinculoTipo: "cliente" | "lead" | null };
export type Vinculo = { valor: string; label: string; grupo: "Clientes" | "Pipeline" };
type Visao = "dia" | "semana" | "mes";

type Props = {
  tarefas: TarefaComVinculo[];
  vinculos: Vinculo[];
  visao: Visao;
  dataBase?: string;
  abrirNova?: boolean;
  vinculoInicial?: string;
  busca: React.ReactNode;
  filtros: React.ReactNode;
};

/*
 * Tela Tarefas do protótipo + visões Semana e Mês (pedido da May).
 * Dia = agrupado (Hoje / Amanhã / Próximos dias / Mais adiante / Concluídas), como no Make.
 */
export function Tarefas({ tarefas, vinculos, visao, dataBase, abrirNova, vinculoInicial, busca, filtros }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hoje = hojeISO();
  const base = dataBase && /^\d{4}-\d{2}-\d{2}$/.test(dataBase) ? dataBase : hoje;

  const [nova, setNova] = useState<{ data?: string } | null>(abrirNova ? {} : null);
  const [editando, setEditando] = useState<TarefaComVinculo | null>(null);

  const fecharNova = useCallback(() => {
    setNova(null);
    if (abrirNova) {
      const n = new URLSearchParams(params.toString());
      n.delete("nova");
      n.delete("cliente");
      router.replace(`${pathname}${n.toString() ? `?${n}` : ""}`);
    }
  }, [abrirNova, params, pathname, router]);

  const setParam = (chave: string, valor: string | null) => {
    const n = new URLSearchParams(params.toString());
    if (valor === null) n.delete(chave);
    else n.set(chave, valor);
    router.replace(`${pathname}${n.toString() ? `?${n}` : ""}`);
  };

  const pendentes = tarefas.filter((t) => !t.concluida_em);
  const concluidas = tarefas.filter((t) => t.concluida_em);
  const altas = pendentes.filter((t) => t.prioridade === "alta").length;
  const total = tarefas.length;
  const progresso = total ? Math.round((concluidas.length / total) * 100) : 0;

  return (
    <>
      {nova && <TarefaFormModal action={criarTarefa} vinculos={vinculos} vinculoInicial={vinculoInicial} dataInicial={nova.data} onClose={fecharNova} />}
      {editando && <TarefaFormModal action={atualizarTarefa.bind(null, editando.id)} vinculos={vinculos} tarefa={editando} onClose={() => setEditando(null)} />}

      <div className="flex flex-col h-full">
        <Header
          titulo="Tarefas"
          sub={
            <>
              {pendentes.length} pendentes ·{" "}
              {altas > 0 && <span className="text-red-400 font-medium">{altas} alta prioridade · </span>}
              {concluidas.length} concluídas
            </>
          }
        >
          {busca}
          <BotaoPrimario onClick={() => setNova({})}>Nova tarefa</BotaoPrimario>
        </Header>

        <Subbar className="gap-3 md:gap-4">
          {/* Dia / Semana / Mês */}
          <div className="flex items-center gap-1 rounded-lg border border-[#311C45] p-0.5">
            {(["dia", "semana", "mes"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setParam("ver", v === "dia" ? null : v)}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-medium transition-colors",
                  visao === v ? "bg-brand-400/15 text-brand-400" : "text-[#968F88] hover:text-[#DDDBD9]",
                )}
              >
                {{ dia: "Dia", semana: "Semana", mes: "Mês" }[v]}
              </button>
            ))}
          </div>
          {visao !== "dia" && <NavegacaoPeriodo visao={visao} base={base} onChange={(d) => setParam("data", d === hoje ? null : d)} />}
          <div className="w-px h-4 bg-[#311C45] shrink-0" />
          {filtros}
        </Subbar>

        {total > 0 && visao === "dia" && (
          <div className="px-4 md:px-6 py-3 border-b border-[#311C45] shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-[#968F88]">Progresso geral</span>
              <span className="text-[10px] font-mono text-brand-400">{progresso}%</span>
            </div>
            <div className="h-1 bg-[#311C45] rounded-full overflow-hidden">
              <div className="h-full bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
          {visao === "dia" && <VisaoDia pendentes={pendentes} concluidas={concluidas} onEditar={setEditando} />}
          {visao === "semana" && <VisaoSemana tarefas={tarefas} base={base} onEditar={setEditando} onNova={(d) => setNova({ data: d })} />}
          {visao === "mes" && <VisaoMes tarefas={tarefas} base={base} onEditar={setEditando} onNova={(d) => setNova({ data: d })} />}
        </div>
      </div>
    </>
  );
}

/* ---------- Dia (agrupado, como o protótipo) ---------- */

const GRUPOS = { atrasadas: "Atrasadas", hoje: "Hoje", amanha: "Amanhã", proximos: "Próximos dias", depois: "Mais adiante", semData: "Sem data", concluidas: "Concluídas" } as const;

function VisaoDia({ pendentes, concluidas, onEditar }: { pendentes: TarefaComVinculo[]; concluidas: TarefaComVinculo[]; onEditar: (t: TarefaComVinculo) => void }) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set(["concluidas"]));
  const hoje = hojeISO();
  const d = (t: Tarefa) => (t.vencimento ? diffDias(hoje, t.vencimento) : null);

  const grupos = [
    { key: "atrasadas", itens: pendentes.filter((t) => d(t) !== null && d(t)! < 0) },
    { key: "hoje", itens: pendentes.filter((t) => d(t) === 0) },
    { key: "amanha", itens: pendentes.filter((t) => d(t) === 1) },
    { key: "proximos", itens: pendentes.filter((t) => d(t) !== null && d(t)! >= 2 && d(t)! <= 7) },
    { key: "depois", itens: pendentes.filter((t) => d(t) !== null && d(t)! > 7) },
    { key: "semData", itens: pendentes.filter((t) => d(t) === null) },
    { key: "concluidas", itens: concluidas },
  ].filter((g) => g.itens.length > 0) as Array<{ key: keyof typeof GRUPOS; itens: TarefaComVinculo[] }>;

  if (grupos.length === 0) return <Vazio icone="✅" titulo="Tudo em dia!" sub="Nenhuma tarefa encontrada com esses filtros." />;

  const toggle = (k: string) =>
    setRecolhidos((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className="space-y-6">
      {grupos.map(({ key, itens }, i) => {
        const recolhido = recolhidos.has(key);
        const feito = key === "concluidas";
        const atras = key === "atrasadas";
        return (
          <div key={key} className="entrar" style={{ animationDelay: `${i * 0.05}s` }}>
            <button type="button" onClick={() => toggle(key)} className="flex items-center gap-2.5 mb-3 w-full text-left">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn("text-[#968F88] transition-transform duration-150", recolhido && "-rotate-90")}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={cn("text-xs font-semibold", feito ? "text-[#968F88]" : atras ? "text-red-400" : "text-[#DDDBD9]")}>{GRUPOS[key]}</span>
              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", feito ? "bg-[#311C45] text-[#968F88]" : atras ? "bg-red-500/20 text-red-400" : "bg-brand-400/20 text-brand-400")}>
                {itens.length}
              </span>
              {key === "hoje" && <span className="ml-auto text-[10px] text-red-400 font-medium">Vence hoje</span>}
            </button>
            {!recolhido && (
              <div className="space-y-2">
                {itens.map((t) => (
                  <CartaoTarefa key={t.id} tarefa={t} onEditar={() => onEditar(t)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CartaoTarefa({ tarefa: t, onEditar }: { tarefa: TarefaComVinculo; onEditar: () => void }) {
  const [pending, startTransition] = useTransition();
  const feita = !!t.concluida_em;
  const hoje = hojeISO();
  const dias = t.vencimento ? diffDias(hoje, t.vencimento) : null;
  const tomPrazo = feita ? "text-[#968F88] bg-[#311C45] border-[#5A496A]" : dias === null ? "text-[#968F88] bg-[#311C45] border-[#5A496A]" : dias < 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : dias === 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : dias === 1 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-[#968F88] bg-[#311C45] border-[#5A496A]";
  const corP = PRIORIDADE_COR[t.prioridade];

  return (
    <div
      className={cn(
        "group flex gap-3.5 p-4 rounded-xl border transition-all duration-150",
        feita ? "bg-transparent border-[#311C45]/40 opacity-50" : "bg-[#231431] border-[#311C45] hover:border-[#5A496A]",
        pending && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => startTransition(() => alternarTarefa(t.id, !feita))}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
          feita ? "bg-emerald-500 border-emerald-500" : "border-[#5A496A] hover:border-brand-400",
        )}
      >
        {feita && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2.5 2.5 4-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <button type="button" onClick={onEditar} className={cn("text-sm font-medium leading-snug text-left", feita ? "line-through text-[#968F88]" : "text-[#DDDBD9] hover:text-[#F5F5F4]")}>
            {t.titulo}
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => excluirTarefa(t.id))}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-[#968F88] hover:text-red-400 transition-all shrink-0"
            title="Excluir"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {t.descricao && !feita && <p className="text-[11px] text-[#968F88] leading-relaxed mb-2 line-clamp-2">{t.descricao}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-[#968F88]">
            <span>{CATEGORIA_TAREFA_ICONE[t.categoria]}</span>
            {CATEGORIA_TAREFA_LABEL[t.categoria]}
          </span>
          {t.vinculoNome && (
            <>
              <span className="text-[#5A496A]">·</span>
              <Link
                href={t.vinculoTipo === "lead" ? `/pipeline/${t.lead_id}` : `/clientes/${t.cliente_id}`}
                className="flex items-center gap-1 text-[10px] text-[#968F88] hover:text-brand-400"
              >
                <span className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-bold bg-brand-400/25 text-brand-300">{t.vinculoNome[0]}</span>
                {t.vinculoNome}
              </Link>
            </>
          )}
          <span className="text-[#5A496A]">·</span>
          <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium", tomPrazo)}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="3.2" stroke="currentColor" strokeWidth="1.1" />
              <path d="M4 2.2v2l1.2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            {rotuloDia(t.vencimento)}
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium" style={{ color: corP, backgroundColor: `${corP}1a`, borderColor: `${corP}33` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: corP }} />
            {PRIORIDADE_LABEL[t.prioridade]}
          </span>
        </div>
      </div>

      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5" title="Mayara">
        MA
      </div>
    </div>
  );
}

/* ---------- Semana ---------- */

function inicioSemana(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

function NavegacaoPeriodo({ visao, base, onChange }: { visao: Visao; base: string; onChange: (d: string) => void }) {
  const hoje = hojeISO();
  const passo = visao === "semana" ? 7 : 0;
  const mover = (dir: -1 | 1) => {
    if (visao === "semana") return onChange(somarDias(base, dir * passo));
    const d = new Date(`${base}T00:00:00`);
    d.setDate(1);
    d.setMonth(d.getMonth() + dir);
    onChange(toISODate(d));
  };
  const rotulo =
    visao === "semana"
      ? `${fmtData(inicioSemana(base), false)} – ${fmtData(somarDias(inicioSemana(base), 6), false)}`
      : (() => {
          const s = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${base}T00:00:00`));
          return s.charAt(0).toUpperCase() + s.slice(1);
        })();

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => mover(-1)} className="w-6 h-6 rounded-md flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/8">
        ‹
      </button>
      <span className="text-xs font-medium text-[#DDDBD9] min-w-[140px] text-center">{rotulo}</span>
      <button type="button" onClick={() => mover(1)} className="w-6 h-6 rounded-md flex items-center justify-center text-[#968F88] hover:text-[#DDDBD9] hover:bg-white/8">
        ›
      </button>
      {base !== hoje && (
        <button type="button" onClick={() => onChange(hoje)} className="ml-1 px-2 py-0.5 rounded text-[10px] text-brand-400 hover:bg-brand-400/10">
          Hoje
        </button>
      )}
    </div>
  );
}

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function VisaoSemana({ tarefas, base, onEditar, onNova }: { tarefas: TarefaComVinculo[]; base: string; onEditar: (t: TarefaComVinculo) => void; onNova: (d: string) => void }) {
  const hoje = hojeISO();
  const inicio = inicioSemana(base);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const semData = tarefas.filter((t) => !t.vencimento && !t.concluida_em);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-3 min-w-[900px]">
        {dias.map((d, i) => {
          const doDia = tarefas.filter((t) => t.vencimento === d);
          const ehHoje = d === hoje;
          return (
            <div key={d} className={cn("flex flex-col rounded-xl border min-h-[420px] entrar", ehHoje ? "border-brand-400/40 bg-brand-400/5" : "border-[#311C45] bg-[#1B0F26]/40")} style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#311C45]">
                <div>
                  <p className={cn("text-[10px] font-semibold uppercase tracking-wider", ehHoje ? "text-brand-400" : "text-[#968F88]")}>{DIAS_SEMANA[i]}</p>
                  <p className={cn("text-sm font-mono font-semibold", ehHoje ? "text-[#F5F5F4]" : "text-[#DDDBD9]")}>{d.slice(8, 10)}</p>
                </div>
                <button type="button" onClick={() => onNova(d)} className="w-6 h-6 rounded-md flex items-center justify-center text-[#968F88] hover:text-brand-400 hover:bg-white/8 transition-colors" title="Nova tarefa neste dia">
                  +
                </button>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {doDia.length === 0 && <p className="text-[10px] text-[#5A496A] text-center pt-6">—</p>}
                {doDia.map((t) => (
                  <MiniTarefa key={t.id} tarefa={t} onEditar={() => onEditar(t)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {semData.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] mb-2">Sem data ({semData.length})</p>
          <div className="grid grid-cols-4 gap-2">
            {semData.map((t) => (
              <MiniTarefa key={t.id} tarefa={t} onEditar={() => onEditar(t)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniTarefa({ tarefa: t, onEditar }: { tarefa: TarefaComVinculo; onEditar: () => void }) {
  const [pending, startTransition] = useTransition();
  const feita = !!t.concluida_em;
  const corP = PRIORIDADE_COR[t.prioridade];
  return (
    <div className={cn("group flex items-start gap-2 p-2 rounded-lg border text-left transition-colors", feita ? "border-[#311C45]/40 opacity-50" : "bg-[#231431] border-[#311C45] hover:border-[#5A496A]", pending && "opacity-40")}>
      <button
        type="button"
        onClick={() => startTransition(() => alternarTarefa(t.id, !feita))}
        className={cn("w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center", feita ? "bg-emerald-500 border-emerald-500" : "border-[#5A496A] hover:border-brand-400")}
      >
        {feita && (
          <svg width="7" height="7" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2.5 2.5 4-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <button type="button" onClick={onEditar} className="flex-1 min-w-0 text-left">
        <p className={cn("text-[11px] font-medium leading-snug line-clamp-2", feita ? "line-through text-[#968F88]" : "text-[#DDDBD9]")}>{t.titulo}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[9px] text-[#968F88] truncate">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: corP }} />
          {CATEGORIA_TAREFA_ICONE[t.categoria]} {t.vinculoNome ?? CATEGORIA_TAREFA_LABEL[t.categoria]}
        </p>
      </button>
    </div>
  );
}

/* ---------- Mês ---------- */

function VisaoMes({ tarefas, base, onEditar, onNova }: { tarefas: TarefaComVinculo[]; base: string; onEditar: (t: TarefaComVinculo) => void; onNova: (d: string) => void }) {
  const hoje = hojeISO();
  const primeiro = `${base.slice(0, 7)}-01`;
  const inicioGrade = inicioSemana(primeiro);
  const celulas = Array.from({ length: 42 }, (_, i) => somarDias(inicioGrade, i));
  const mes = base.slice(0, 7);
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <p key={d} className="text-[10px] font-semibold uppercase tracking-wider text-[#968F88] text-center py-1">
            {d}
          </p>
        ))}
        {celulas.map((d, i) => {
          const doMes = d.slice(0, 7) === mes;
          const doDia = tarefas.filter((t) => t.vencimento === d);
          const pend = doDia.filter((t) => !t.concluida_em);
          const ehHoje = d === hoje;
          const atras = d < hoje && pend.length > 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setAberto(d)}
              className={cn(
                "flex flex-col items-start rounded-lg border p-1 sm:p-1.5 min-h-[52px] sm:min-h-[86px] text-left transition-colors entrar",
                doMes ? "bg-[#231431] border-[#311C45] hover:border-[#5A496A]" : "bg-transparent border-[#311C45]/40 opacity-40",
                ehHoje && "border-brand-400/60",
              )}
              style={{ animationDelay: `${(i % 7) * 0.02}s` }}
            >
              <span className={cn("text-[11px] font-mono", ehHoje ? "text-brand-400 font-semibold" : "text-[#968F88]")}>{Number(d.slice(8, 10))}</span>
              <div className="mt-1 space-y-0.5 w-full hidden sm:block">
                {doDia.slice(0, 3).map((t) => (
                  <p key={t.id} className={cn("text-[9px] leading-tight truncate px-1 rounded", t.concluida_em ? "text-[#5A496A] line-through" : atras ? "text-red-300 bg-red-500/10" : "text-[#DDDBD9] bg-white/5")}>
                    {t.titulo}
                  </p>
                ))}
                {doDia.length > 3 && <p className="text-[9px] text-[#968F88] px-1">+{doDia.length - 3}</p>}
              </div>
              {doDia.length > 0 && (
                <span className={cn("sm:hidden mt-1 text-[9px] font-mono px-1 rounded", atras ? "text-red-300 bg-red-500/10" : pend.length ? "text-[#DDDBD9] bg-white/5" : "text-[#5A496A]")}>
                  {doDia.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {aberto && (
        <div className="rounded-xl border border-[#311C45] bg-[#1B0F26] p-4 entrar">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#DDDBD9]">
              {rotuloDia(aberto)} <span className="text-[#968F88] font-normal">· {fmtData(aberto)}</span>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onNova(aberto)} className="px-2.5 py-1 text-[11px] text-brand-400 border border-brand-400/30 hover:bg-brand-400/10 rounded-lg transition-colors">
                + Tarefa neste dia
              </button>
              <button type="button" onClick={() => setAberto(null)} className="text-[#968F88] hover:text-[#DDDBD9] text-xs px-1">
                ×
              </button>
            </div>
          </div>
          {tarefas.filter((t) => t.vencimento === aberto).length === 0 ? (
            <p className="text-xs text-[#968F88]">Nada agendado.</p>
          ) : (
            <div className="space-y-2">
              {tarefas
                .filter((t) => t.vencimento === aberto)
                .map((t) => (
                  <CartaoTarefa key={t.id} tarefa={t} onEditar={() => onEditar(t)} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
