'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DataPoint {
  month: string
  value: number
  goal?: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function RevenueGoalChart({ data }: { data: DataPoint[] }) {
  const hasGoal = data.some((d) => d.goal !== undefined && d.goal > 0)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-dm-sans)' }}
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
          formatter={(v, name) => [
            fmt(Number(v)),
            name === 'goal' ? 'Meta' : 'Receita',
          ]}
          cursor={{ stroke: 'rgba(37,99,235,0.3)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#rgGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
        />
        {hasGoal && (
          <Line
            type="monotone"
            dataKey="goal"
            stroke="#fb923c"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3, fill: '#fb923c', strokeWidth: 0 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
