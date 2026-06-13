'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

interface DataPoint {
  month: string
  value: number
  goal?: number
  isCurrent?: boolean
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function RevenueBarsChart({ data }: { data: DataPoint[] }) {
  const maxGoal = Math.max(...data.map((d) => d.goal ?? 0))

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-dm-sans)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-dm-sans)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: '#131320',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: 'rgba(255,255,255,0.88)',
              fontSize: 12,
            }}
            formatter={(v, name) => [fmt(Number(v)), name === 'goal' ? 'Meta' : 'Receita']}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          {maxGoal > 0 && (
            <Bar dataKey="goal" radius={[3, 3, 0, 0]} maxBarSize={28} fill="rgba(251,146,60,0.2)" stroke="#fb923c" strokeWidth={1} />
          )}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.isCurrent ? '#2563eb' : 'rgba(37,99,235,0.45)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {maxGoal > 0 && (
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563eb' }} />
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Realizado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 10, height: 10, borderRadius: 2, border: '1px solid #fb923c', background: 'rgba(251,146,60,0.2)' }} />
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Meta</span>
          </div>
        </div>
      )}
    </div>
  )
}
