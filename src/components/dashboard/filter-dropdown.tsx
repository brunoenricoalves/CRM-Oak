'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'

const SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

interface Stage { id: string; name: string }
interface User { id: string; name: string }

interface Props {
  period: string
  from?: string
  to?: string
  stages: Stage[]
  users: User[]
  activeOwner?: string
  activeStage?: string
  activeSource?: string
}

export function FilterDropdown({
  period, from, to,
  stages, users,
  activeOwner, activeStage, activeSource,
}: Props) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState(activeOwner ?? '')
  const [stage, setStage] = useState(activeStage ?? '')
  const [source, setSource] = useState(activeSource ?? '')

  const activeCount = [activeOwner, activeStage, activeSource].filter(Boolean).length

  // Reset local state when active filters change (e.g. after navigating)
  useEffect(() => {
    setOwner(activeOwner ?? '')
    setStage(activeStage ?? '')
    setSource(activeSource ?? '')
  }, [activeOwner, activeStage, activeSource])

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function buildHref(o: string, s: string, src: string) {
    const params = new URLSearchParams()
    params.set('period', period)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (o) params.set('owner', o)
    if (s) params.set('stage', s)
    if (src) params.set('source', src)
    return `/dashboard?${params.toString()}`
  }

  function apply() {
    router.push(buildHref(owner, stage, source))
    setOpen(false)
  }

  function clear() {
    setOwner('')
    setStage('')
    setSource('')
    router.push(buildHref('', '', ''))
    setOpen(false)
  }

  const stageOptions: Stage[] = [
    ...stages,
    { id: 'won', name: 'Ganho' },
    { id: 'lost', name: 'Perdido' },
  ]

  const selectStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--surface-border)',
    color: 'var(--text-secondary)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    appearance: 'none' as const,
    cursor: 'pointer',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-all"
        style={{
          background: activeCount > 0 ? 'rgba(37,99,235,0.15)' : 'var(--surface)',
          border: `1px solid ${activeCount > 0 ? '#2563eb' : 'var(--surface-border)'}`,
          color: activeCount > 0 ? '#60a5fa' : 'var(--text-dim)',
        }}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {activeCount > 0 ? `Filtros · ${activeCount}` : 'Filtros'}
        <ChevronDown className="w-3 h-3 opacity-60" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 rounded-xl p-4 flex flex-col gap-4"
          style={{
            width: 280,
            background: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              Filtros
            </span>
            {activeCount > 0 && (
              <button onClick={clear} className="flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
                <X className="w-3 h-3" /> Limpar tudo
              </button>
            )}
          </div>

          {/* Responsável */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Responsável</label>
            <div className="relative">
              <select value={owner} onChange={e => setOwner(e.target.value)} style={selectStyle}>
                <option value="">Todos</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            </div>
          </div>

          {/* Status do negócio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status do negócio</label>
            <div className="relative">
              <select value={stage} onChange={e => setStage(e.target.value)} style={selectStyle}>
                <option value="">Todos</option>
                {stageOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            </div>
          </div>

          {/* Origem do lead */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Origem do lead</label>
            <div className="relative">
              <select value={source} onChange={e => setSource(e.target.value)} style={selectStyle}>
                <option value="">Todas</option>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            </div>
          </div>

          <button
            onClick={apply}
            className="w-full py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#2563eb', color: 'var(--text-primary)' }}
          >
            Aplicar filtros
          </button>
        </div>
      )}
    </div>
  )
}
