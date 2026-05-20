'use client'

import Link from 'next/link'

const R = 85
const CX = 120
const CY = 108
const SW = 13

function toXY(deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) }
}

const S = toXY(180)
const M = toXY(90)
const E = toXY(0)
const TRACK = `M ${S.x} ${S.y} A ${R} ${R} 0 0 1 ${M.x} ${M.y} A ${R} ${R} 0 0 1 ${E.x} ${E.y}`

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

interface Props { wonValue: number; goal: number | null }

export function GoalGauge({ wonValue, goal }: Props) {
  const hasGoal = goal != null && goal > 0
  const pct = hasGoal ? (wonValue / goal!) * 100 : 0
  const arcPct = Math.min(pct, 100)
  const endAngle = 180 - arcPct * 1.8
  const arcEnd = toXY(endAngle)

  let progressD = ''
  if (hasGoal && arcPct > 0.5) {
    progressD = endAngle >= 90
      ? `M ${S.x} ${S.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`
      : `M ${S.x} ${S.y} A ${R} ${R} 0 0 1 ${M.x} ${M.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 240 128" width="100%" style={{ maxWidth: 220, overflow: 'visible' }}>
        <defs>
          <linearGradient id="gg" x1={CX - R} y1={CY} x2={CX + R} y2={CY} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="50%"  stopColor="#10b981" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <filter id="gw" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path d={TRACK} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={SW} strokeLinecap="round" />

        {/* Progress arc */}
        {progressD && (
          <path d={progressD} fill="none" stroke="url(#gg)" strokeWidth={SW} strokeLinecap="round" />
        )}

        {/* Glowing tip dot */}
        {hasGoal && arcPct > 0.5 && (
          <circle cx={arcEnd.x} cy={arcEnd.y} r={6} fill="white" fillOpacity={0.92} filter="url(#gw)" />
        )}

        {/* Percentage value */}
        <text
          x={CX} y={CY - 4}
          textAnchor="middle"
          fill={hasGoal ? 'var(--text-primary)' : 'var(--text-dim)'}
          fontFamily="var(--font-syne)"
          fontSize="34"
          fontWeight="700"
        >
          {hasGoal ? `${Math.round(pct)}%` : '—'}
        </text>

        {/* Sub label */}
        <text x={CX} y={CY + 18} textAnchor="middle" fill="var(--text-dim)" fontSize="11">
          {hasGoal ? 'da meta atingida' : 'sem meta definida'}
        </text>
      </svg>

      {hasGoal ? (
        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
            {fmt(wonValue)}{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>de {fmt(goal!)}</span>
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>este mês</p>
        </div>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          Configure em{' '}
          <Link href="/reports" style={{ color: '#3b82f6' }}>Relatórios</Link>
        </p>
      )}
    </div>
  )
}
