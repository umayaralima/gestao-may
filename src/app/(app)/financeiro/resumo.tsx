"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/ui/primitivos";
import { cn } from "@/lib/cn";
import { formatBRL, fmtK } from "@/lib/format";

/*
 * Aba Resumo: entrou, saiu e sobrou. É o que diz se o mês fechou no azul —
 * o Financeiro sozinho só mostrava faturamento.
 */

export type MesResumo = { mes: string; rotulo: string; receita: number; despesa: number; lucro: number };

export function ResumoFinanceiro({ meses }: { meses: MesResumo[] }) {
  const totalReceita = meses.reduce((s, m) => s + m.receita, 0);
  const totalDespesa = meses.reduce((s, m) => s + m.despesa, 0);
  const lucro = totalReceita - totalDespesa;
  const margem = totalReceita > 0 ? Math.round((lucro / totalReceita) * 100) : null;
  const mesAtual = meses.at(-1);
  const comMovimento = meses.filter((m) => m.receita > 0 || m.despesa > 0);
  const mediaDespesa = comMovimento.length ? totalDespesa / comMovimento.length : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label="Entrou" value={fmtK(totalReceita)} sub={`${meses.length} meses`} accent="text-sucesso-cor" />
        <KpiCard label="Saiu" value={fmtK(totalDespesa)} sub={`média de ${formatBRL(mediaDespesa)}/mês`} accent="text-falha-cor" />
        <KpiCard label="Sobrou" value={fmtK(lucro)} sub={margem !== null ? `margem de ${margem}%` : "sem receita no período"} accent={lucro >= 0 ? "text-sucesso-cor" : "text-falha-cor"} />
        <KpiCard
          label="Este mês"
          value={mesAtual ? fmtK(mesAtual.lucro) : "—"}
          sub={mesAtual ? `${formatBRL(mesAtual.receita)} − ${formatBRL(mesAtual.despesa)}` : ""}
          accent={(mesAtual?.lucro ?? 0) >= 0 ? "text-sucesso-cor" : "text-falha-cor"}
        />
      </div>

      <div className="bg-superficie border border-borda rounded-xl p-5">
        <div className="mb-5">
          <p className="text-sm font-semibold text-texto">Entrou × saiu</p>
          <p className="text-xs text-texto-mudo mt-0.5">Recebido e pago por mês, últimos {meses.length} meses</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={meses} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--borda)" />
            <XAxis dataKey="rotulo" tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} width={36} />
            <Tooltip content={<DicaResumo />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="receita" name="Entrou" fill="var(--sucesso-cor)" radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="despesa" name="Saiu" fill="var(--falha-cor)" radius={[3, 3, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <Legenda cor="bg-emerald-400" texto="Entrou" />
          <Legenda cor="bg-red-400" texto="Saiu" />
        </div>
      </div>

      <div className="bg-superficie border border-borda rounded-xl p-5">
        <div className="mb-5">
          <p className="text-sm font-semibold text-texto">O que sobrou</p>
          <p className="text-xs text-texto-mudo mt-0.5">Lucro mês a mês</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={meses} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="lucroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--acento-texto)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--acento-texto)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--borda)" />
            <XAxis dataKey="rotulo" tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))} width={36} />
            <Tooltip content={<DicaResumo />} />
            <Area type="monotone" dataKey="lucro" name="Sobrou" stroke="var(--acento-texto)" strokeWidth={2} fill="url(#lucroGrad)" dot={false} activeDot={{ r: 4, fill: "var(--acento-texto)", stroke: "var(--fundo)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-superficie border border-borda rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-borda">
          <p className="text-sm font-semibold text-texto">Mês a mês</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-borda">
                {["Mês", "Entrou", "Saiu", "Sobrou"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-texto-mudo">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...meses].reverse().map((m) => (
                <tr key={m.mes} className="border-b border-borda/60">
                  <td className="px-5 py-3 text-xs text-texto-suave capitalize">{m.rotulo}</td>
                  <td className="px-5 py-3 text-xs font-mono text-sucesso-cor">{m.receita ? formatBRL(m.receita) : "—"}</td>
                  <td className="px-5 py-3 text-xs font-mono text-falha-cor">{m.despesa ? formatBRL(m.despesa) : "—"}</td>
                  <td className={cn("px-5 py-3 text-xs font-mono font-semibold", m.lucro >= 0 ? "text-texto-suave" : "text-falha-cor")}>{formatBRL(m.lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-texto-mudo">
      <span className={cn("w-2.5 h-2.5 rounded-sm", cor)} /> {texto}
    </span>
  );
}

function DicaResumo({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string; color?: string; stroke?: string; fill?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-superficie-2 border border-borda-forte rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-texto-mudo mb-1.5 font-medium capitalize">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono" style={{ color: p.color ?? p.stroke ?? p.fill }}>
          <span className="text-texto-mudo mr-1.5">{p.name}</span>
          {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
}
