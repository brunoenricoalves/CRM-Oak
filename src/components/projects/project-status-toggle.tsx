'use client'

import { useTransition } from 'react'
import { updateProjectStatus } from '@/server/actions/project'

type Status = 'active' | 'paused' | 'closed'

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string; next: Status }> = {
  active: { label: 'Em andamento', bg: 'rgba(52,211,153,0.15)',  color: '#10b981', next: 'paused' },
  paused: { label: 'Pausado',      bg: 'rgba(251,191,36,0.15)',  color: '#f59e0b', next: 'closed' },
  closed: { label: 'Encerrado',    bg: 'rgba(160,160,184,0.15)', color: '#a0a0b8', next: 'active' },
}

interface Props {
  projectId: string
  status: Status
}

export function ProjectStatusToggle({ projectId, status }: Props) {
  const [isPending, startTransition] = useTransition()
  const config = STATUS_CONFIG[status]

  function handleClick() {
    startTransition(() => {
      updateProjectStatus(projectId, config.next)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Clique para mudar status"
      className="text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity"
      style={{
        background: config.bg,
        color: config.color,
        border: 'none',
        opacity: isPending ? 0.5 : 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </button>
  )
}
