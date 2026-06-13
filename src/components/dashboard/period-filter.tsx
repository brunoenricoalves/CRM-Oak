'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'

// ─── Period options ───────────────────────────────────────────────────────────
const PERIODS = [
  { value: 'today',    label: 'Hoje' },
  { value: '7days',    label: '7 dias' },
  { value: '30days',   label: '30 dias' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year',     label: 'Ano' },
  { value: 'custom',   label: 'Personalizado' },
]

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const WEEK_DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

interface Props {
  activePeriod: string
  from?: string
  to?: string
  owner?: string
  stage?: string
  source?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear()
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const leading = (first.getDay() + 6) % 7   // Mon = 0
  const cells: (Date | null)[] = Array(leading).fill(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function buttonLabel(activePeriod: string, from?: string, to?: string): string {
  if (activePeriod === 'custom' && from && to) {
    const fmt = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    return `${fmt(from)} → ${fmt(to)}`
  }
  return PERIODS.find(p => p.value === activePeriod)?.label ?? 'Período'
}

// ─── Single month calendar ────────────────────────────────────────────────────
interface CalProps {
  year: number; month: number
  start: Date | null; end: Date | null; hover: Date | null
  onDay: (d: Date) => void
  onHover: (d: Date | null) => void
  onPrev?: () => void
  onNext?: () => void
}

function CalendarMonth({ year, month, start, end, hover, onDay, onHover, onPrev, onNext }: CalProps) {
  const today = new Date()
  const cells = buildGrid(year, month)
  const effEnd = end ?? hover
  const lo = start && effEnd ? Math.min(start.getTime(), effEnd.getTime()) : null
  const hi = start && effEnd ? Math.max(start.getTime(), effEnd.getTime()) : null

  return (
    <div style={{ minWidth: 224 }}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          type="button"
          onClick={onPrev}
          style={{
            visibility: onPrev ? 'visible' : 'hidden',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 6, borderRadius: 6, color: 'var(--text-dim)',
            minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={onNext}
          style={{
            visibility: onNext ? 'visible' : 'hidden',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 6, borderRadius: 6, color: 'var(--text-dim)',
            minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="flex items-center justify-center" style={{ height: 28, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} style={{ height: 36 }} />

          const ts      = day.getTime()
          const isStart = !!(start && isSameDay(day, start))
          const isEnd   = !!(end   && isSameDay(day, end))
          const isEp    = isStart || isEnd
          const inRange = !!(lo && hi && ts > lo && ts < hi)
          const isToday = isSameDay(day, today)

          // Range bar
          const showBar = isEp
            ? !!(start && effEnd && !isSameDay(start, effEnd))
            : inRange
          const barLeft  = isStart ? '50%' : '0%'
          const barRight = isEnd   ? '50%' : '0%'

          return (
            <div
              key={ts}
              onClick={() => onDay(day)}
              onMouseEnter={() => onHover(day)}
              onMouseLeave={() => onHover(null)}
              className="relative flex items-center justify-center"
              style={{ height: 36, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' }}
            >
              {showBar && (
                <div style={{
                  position: 'absolute', top: 3, bottom: 3,
                  left: barLeft, right: barRight,
                  background: end ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.1)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{
                position: 'relative', zIndex: 1,
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isEp ? '#2563eb' : 'transparent',
                outline: isToday && !isEp ? '1.5px solid #3b82f6' : 'none',
                outlineOffset: '-2px',
                fontSize: 13, fontWeight: isEp ? 600 : 400,
                color: isEp ? '#ffffff' : inRange ? '#93c5fd' : isToday ? '#60a5fa' : 'var(--text-secondary)',
                transition: 'background 0.1s',
              }}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main PeriodFilter ────────────────────────────────────────────────────────
export function PeriodFilter({ activePeriod, from, to, owner, stage, source }: Props) {
  const router     = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [open,         setOpen]         = useState(false)
  const [showCalendar, setShowCalendar] = useState(activePeriod === 'custom')

  // Calendar navigation — default: left = prev month, right = current month
  const now = new Date()
  const initLeft = now.getMonth() === 0
    ? { y: now.getFullYear() - 1, m: 11 }
    : { y: now.getFullYear(), m: now.getMonth() - 1 }

  const [leftYear,  setLeftYear]  = useState(initLeft.y)
  const [leftMonth, setLeftMonth] = useState(initLeft.m)
  const rightYear  = leftMonth === 11 ? leftYear + 1 : leftYear
  const rightMonth = (leftMonth + 1) % 12

  // Range selection state
  const initStart = activePeriod === 'custom' && from ? new Date(from + 'T00:00:00') : null
  const initEnd   = activePeriod === 'custom' && to   ? new Date(to   + 'T00:00:00') : null
  const [startDate, setStartDate] = useState<Date | null>(initStart)
  const [endDate,   setEndDate]   = useState<Date | null>(initEnd)
  const [hover,     setHover]     = useState<Date | null>(null)
  const [picking,   setPicking]   = useState<'start' | 'end'>(initStart ? 'end' : 'start')

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Preserve active filters in all hrefs
  function buildHref(p: string, f?: string, t?: string) {
    const params = new URLSearchParams()
    params.set('period', p)
    if (f) params.set('from', f)
    if (t) params.set('to', t)
    if (owner) params.set('owner', owner)
    if (stage) params.set('stage', stage)
    if (source) params.set('source', source)
    return `/dashboard?${params.toString()}`
  }

  function selectPeriod(value: string) {
    if (value === 'custom') {
      setShowCalendar(true)
    } else {
      router.push(buildHref(value))
      setOpen(false)
      setShowCalendar(false)
    }
  }

  function handleDayClick(day: Date) {
    if (picking === 'start') {
      setStartDate(day)
      setEndDate(null)
      setPicking('end')
    } else {
      if (startDate && day < startDate) {
        setEndDate(startDate)
        setStartDate(day)
      } else {
        setEndDate(day)
      }
      setPicking('start')
    }
  }

  function apply() {
    if (!startDate || !endDate) return
    const [s, e] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
    router.push(buildHref('custom', toISO(s), toISO(e)))
    setOpen(false)
    setShowCalendar(false)
  }

  function cancel() {
    setShowCalendar(false)
    setStartDate(initStart)
    setEndDate(initEnd)
    setPicking(initStart ? 'end' : 'start')
    if (!startDate && !endDate) setOpen(false)
  }

  function prevMonth() {
    if (leftMonth === 0) { setLeftYear(y => y - 1); setLeftMonth(11) }
    else setLeftMonth(m => m - 1)
  }
  function nextMonth() {
    if (leftMonth === 11) { setLeftYear(y => y + 1); setLeftMonth(0) }
    else setLeftMonth(m => m + 1)
  }

  const canApply = !!(startDate && endDate)
  const label = buttonLabel(activePeriod, from, to)

  // Hint text for calendar
  let hint = 'Selecione a data de início'
  if (startDate && !endDate) hint = 'Agora selecione a data de fim'
  if (startDate && endDate) {
    const [s, e] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
    hint = `${toISO(s)} → ${toISO(e)}`
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-all"
        style={{
          background: open ? 'rgba(37,99,235,0.12)' : 'var(--surface)',
          border: `1px solid ${open ? '#2563eb' : 'var(--surface-border)'}`,
          color: open ? '#60a5fa' : 'var(--text-secondary)',
          minHeight: 44,
        }}
      >
        <span style={{ fontFamily: 'var(--font-syne)' }}>{label}</span>
        <ChevronDown
          className="w-3.5 h-3.5 opacity-70"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 rounded-xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
            minWidth: showCalendar ? 'max-content' : 180,
          }}
        >
          {/* Period options list */}
          <div className="py-1.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => selectPeriod(p.value)}
                className="w-full flex items-center justify-between px-4 transition-colors text-sm font-medium"
                style={{
                  minHeight: 44,
                  background: activePeriod === p.value ? 'rgba(37,99,235,0.10)' : 'transparent',
                  color: activePeriod === p.value ? '#60a5fa' : 'var(--text-secondary)',
                  border: 'none',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (activePeriod !== p.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (activePeriod !== p.value) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{p.label}</span>
                {activePeriod === p.value && <Check className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />}
                {p.value === 'custom' && activePeriod !== 'custom' && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                )}
              </button>
            ))}
          </div>

          {/* Calendar section — expands inline when Personalizado is selected */}
          {showCalendar && (
            <div style={{ borderTop: '1px solid var(--surface-border)', padding: '16px 20px 20px' }}>
              {/* Hint */}
              <p className="text-center text-xs mb-4" style={{ color: 'var(--text-dim)' }}>{hint}</p>

              {/* Two months side by side */}
              <div className="flex gap-5">
                <CalendarMonth
                  year={leftYear}  month={leftMonth}
                  start={startDate} end={endDate} hover={hover}
                  onDay={handleDayClick} onHover={setHover}
                  onPrev={prevMonth}
                />
                <div style={{ width: 1, background: 'var(--surface-border)', alignSelf: 'stretch' }} />
                <CalendarMonth
                  year={rightYear} month={rightMonth}
                  start={startDate} end={endDate} hover={hover}
                  onDay={handleDayClick} onHover={setHover}
                  onNext={nextMonth}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                <button
                  type="button"
                  onClick={cancel}
                  className="px-4 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    minHeight: 44, border: '1px solid var(--surface-border)',
                    background: 'transparent', color: 'var(--text-muted)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={!canApply}
                  className="px-4 rounded-lg text-sm font-medium transition-all"
                  style={{
                    minHeight: 44, border: 'none',
                    background: canApply ? '#2563eb' : 'rgba(37,99,235,0.3)',
                    color: '#ffffff',
                    opacity: canApply ? 1 : 0.7,
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
