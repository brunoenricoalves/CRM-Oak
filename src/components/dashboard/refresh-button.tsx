'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date())
  const [label, setLabel] = useState('Atualizado agora')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const mins = Math.round((Date.now() - updatedAt.getTime()) / 60000)
      if (mins < 1) setLabel('Atualizado agora')
      else if (mins === 1) setLabel('Atualizado há 1 min')
      else setLabel(`Atualizado há ${mins} min`)
    }, 30000)
    return () => clearInterval(interval)
  }, [updatedAt])

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setUpdatedAt(new Date())
      setLabel('Atualizado agora')
      setRefreshing(false)
    }, 800)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        color: '#34d399',
        opacity: refreshing ? 0.6 : 1,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: '#34d399',
          boxShadow: '0 0 6px #34d399',
          animation: refreshing ? 'pulse 0.8s ease infinite' : 'none',
        }}
      />
      {refreshing ? 'Atualizando…' : label}
    </button>
  )
}
