'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { ExternalLink, Pencil, Check, X } from 'lucide-react'
import { updateProjectMondayUrl } from '@/server/actions/project'

interface Props {
  projectId: string
  mondayUrl: string | null
}

export function ProjectMondayInput({ projectId, mondayUrl }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(mondayUrl ?? '')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function save() {
    startTransition(() => {
      updateProjectMondayUrl(projectId, value)
    })
    setEditing(false)
  }

  function cancel() {
    setValue(mondayUrl ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          placeholder="https://monday.com/..."
          className="rounded px-2 py-1 text-xs"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            width: 200,
          }}
        />
        <button type="button" onClick={save} disabled={isPending}
          style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 4 }}>
          <Check className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={cancel}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {mondayUrl && (
        <a
          href={mondayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
          style={{ background: 'rgba(99,91,255,0.12)', color: '#6366f1', textDecoration: 'none' }}
        >
          <ExternalLink className="w-3 h-3" />
          Monday
        </a>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={mondayUrl ? 'Editar link' : 'Adicionar link do Monday'}
        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
