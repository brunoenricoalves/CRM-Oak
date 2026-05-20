'use client'

import Link from 'next/link'

const R = 88
const CX = 130
const CY = 118
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
  const showProgress = hasGoal && arcPct > 0.5

  const progressD = showProgress
    ? endAngle >= 90
      ? `M ${S.x} ${S.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`
      : `M ${S.x} ${S.y} A ${R} ${R} 0 0 1 ${M.x} ${M.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 260 158" width="100%" style={{ maxWidth: 240, overflow: 'visible' }}>
        <defs>
          {/* Arc gradient */}
          <linearGradient id="gg" x1={S.x} y1={CY} x2={E.x} y2={CY} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="50%"  stopColor="#10b981" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          {/* Percentage text gradient */}
          <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>

          {/* Background ambient glow */}
          <radialGradient id="bgG" cx="50%" cy="88%" r="65%">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.09" />
            <stop offset="55%"  stopColor="#10b981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Arc glow filter */}
          <filter id="aGlow" x="-15%" y="-40%" width="130%" height="180%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Tip dot glow filter */}
          <filter id="dGlow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pulse animation */}
          <style>{`
            @keyframes gp1{0%,100%{opacity:0.04}50%{opacity:0.2}}
            @keyframes gp2{0%,100%{opacity:0.08}50%{opacity:0.3}}
            .gr1{animation:gp1 3s ease-in-out infinite}
            .gr2{animation:gp2 3s ease-in-out infinite .9s}
          `}</style>
        </defs>

        {/* Ambient background glow */}
        <rect width="260" height="158" fill="url(#bgG)" />

        {/* HUD corner brackets */}
        <path d="M 13 54 L 13 11 L 56 11" fill="none" stroke="rgba(59,130,246,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 247 54 L 247 11 L 204 11" fill="none" stroke="rgba(59,130,246,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Inner corner dots */}
        <circle cx="13" cy="11" r="2" fill="rgba(59,130,246,0.5)" />
        <circle cx="247" cy="11" r="2" fill="rgba(59,130,246,0.5)" />

        {/* Baseline diameter */}
        <line x1={S.x} y1={CY} x2={E.x} y2={CY} stroke="rgba(59,130,246,0.1)" strokeWidth="1" />

        {/* Track */}
        <path d={TRACK} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={SW} strokeLinecap="round" />

        {/* Progress arc with glow */}
        {progressD && (
          <path d={progressD} fill="none" stroke="url(#gg)" strokeWidth={SW} strokeLinecap="round" filter="url(#aGlow)" />
        )}

        {/* Tip — pulse rings + dot */}
        {showProgress && (
          <>
            <circle cx={arcEnd.x} cy={arcEnd.y} r={24} fill="white" className="gr1" />
            <circle cx={arcEnd.x} cy={arcEnd.y} r={15} fill="white" className="gr2" />
            <circle cx={arcEnd.x} cy={arcEnd.y} r={5} fill="white" fillOpacity={0.95} filter="url(#dGlow)" />
          </>
        )}

        {/* Percentage — gradient text */}
        <text
          x={CX}
          y={98}
          textAnchor="middle"
          fill={hasGoal ? 'url(#tg)' : 'var(--text-dim)'}
          fontFamily="var(--font-syne)"
          fontSize="42"
          fontWeight="800"
          letterSpacing="-1"
        >
          {hasGoal ? `${Math.round(pct)}%` : '—'}
        </text>

        {/* Label — uppercase spaced */}
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          fill="var(--text-faint)"
          fontSize="9"
          letterSpacing="2.5"
          fontFamily="var(--font-syne)"
        >
          {hasGoal ? 'DA META ATINGIDA' : 'SEM META DEFINIDA'}
        </text>
      </svg>

      {/* Value row */}
      {hasGoal ? (
        <div style={{ textAlign: 'center', marginTop: -4 }}>
          <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
            {fmt(wonValue)}{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>/ {fmt(goal!)}</span>
          </p>
          <p style={{ fontSize: 10, marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            este mês
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-dim)', marginTop: -4 }}>
          Configure em{' '}
          <Link href="/reports" style={{ color: '#60a5fa' }}>Relatórios</Link>
        </p>
      )}
    </div>
  )
}
