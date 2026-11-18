"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";

/*
 * Gráficos do Dashboard, copiados do App.tsx do protótipo (recharts com a animação
 * de entrada padrão, que é a "leve animação" da tela inicial). Só os dados são reais.
 */

type TooltipProps = { active?: boolean; payload?: Array<{ value: number; color?: string; name?: string }>; label?: string; prefix?: string };

function ChartTooltip({ active, payload, label, prefix = "" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-superficie-2 border border-borda-forte rounded-lg px-3 py-2 text-xs">
      <p className="text-texto-mudo mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono font-medium" style={{ color: p.color }}>
          {prefix}
          {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
        </p>
      ))}
    </div>
  );
}

export type PontoReceita = { mes: string; valor: number };

export function ReceitaMensal({ dados }: { dados: PontoReceita[] }) {
  const [periodo, setPeriodo] = useState<3 | 6 | 12>(6);
  const visiveis = dados.slice(-periodo);
  return (
    <div className="lg:col-span-2 bg-superficie border border-borda rounded-xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-texto">Receita mensal</p>
          <p className="text-xs text-texto-mudo mt-0.5">Pagamentos recebidos, últimos {periodo} meses</p>
        </div>
        <div className="flex gap-2">
          {([3, 6, 12] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                periodo === p ? "bg-brand-400/15 text-brand-400" : "text-texto-mudo hover:text-texto-suave",
              )}
            >
              {p === 12 ? "1A" : `${p}M`}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={visiveis} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acento-texto)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--acento-texto)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--borda)" />
          <XAxis dataKey="mes" tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} width={36} />
          <Tooltip content={<ChartTooltip prefix="R$ " />} />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="var(--acento-texto)"
            strokeWidth={2}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--acento-texto)", stroke: "var(--fundo)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type FatiaPipeline = { name: string; value: number; color: string };

export function PipelineDonut({ dados }: { dados: FatiaPipeline[] }) {
  const total = dados.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-superficie border border-borda rounded-xl p-5">
      <p className="text-sm font-semibold text-texto mb-0.5">Pipeline</p>
      <p className="text-xs text-texto-mudo mb-4">Distribuição por etapa</p>
      {total === 0 ? (
        <p className="py-10 text-center text-xs text-texto-mudo">Nenhum lead ainda.</p>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie data={dados} cx="50%" cy="50%" innerRadius={36} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
              {dados.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as FatiaPipeline;
                return (
                  <div className="bg-superficie-2 border border-borda-forte rounded-lg px-3 py-2 text-xs">
                    <p style={{ color: d.color }} className="font-medium">
                      {d.name}
                    </p>
                    <p className="text-texto-mudo font-mono">{d.value} lead(s)</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="mt-3 space-y-2">
        {dados.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[11px] text-texto-sutil">{d.name}</span>
            </div>
            <span className="text-[11px] font-mono text-texto-mudo">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type DiaAtividade = { dia: string; mensagens: number; conversas: number };

export function AtividadeSemanal({ dados }: { dados: DiaAtividade[] }) {
  return (
    <div className="lg:col-span-2 bg-superficie border border-borda rounded-xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-texto">Atividade semanal</p>
          <p className="text-xs text-texto-mudo">Interações registradas nos últimos 7 dias</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-texto-mudo">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-400 inline-block" /> Mensagens
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-600 inline-block" /> Ligações e reuniões
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={dados} barGap={4} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--borda)" />
          <XAxis dataKey="dia" tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--texto-mudo)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="mensagens" name="Mensagens" fill="var(--serie-1)" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="conversas" name="Ligações e reuniões" fill="var(--serie-4)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
