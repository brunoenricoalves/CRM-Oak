'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { moveDeal } from '@/server/actions/deal'
import { DealCard } from './deal-card'

type Deal = {
  id: string
  title: string
  value: number | null
  stage_id: string | null
  position: number
  contacts: { name: string } | null
  companies: { name: string } | null
}

type Stage = {
  id: string
  name: string
  color: string | null
  position: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

function SortableDealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', stageId: deal.stage_id },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
      {...attributes}
      {...listeners}
    >
      <DealCard deal={deal} />
    </div>
  )
}

function DroppableColumn({ stage, deals, isOver }: { stage: Stage; deals: Deal[]; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const color = stage.color ?? '#2563eb'

  return (
    <div className="flex-shrink-0 w-68" style={{ width: 272 }}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold tracking-wide flex-1 truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-syne)' }}>
          {stage.name.toUpperCase()}
        </span>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-dim)' }}>
          {deals.length}
        </span>
      </div>

      {/* Total value */}
      {total > 0 && (
        <p className="text-xs font-semibold mb-2 px-1" style={{ color }}>
          {fmt(total)}
        </p>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="rounded-xl p-2 min-h-28 space-y-2 transition-colors duration-150"
        style={{
          background: isOver ? `${color}18` : 'rgba(255,255,255,0.025)',
          border: `1px solid ${isOver ? color + '55' : 'var(--surface-border)'}`,
        }}
      >
        <SortableContext id={stage.id} items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ stages, deals }: { stages: Stage[]; deals: Deal[] }) {
  const [items, setItems] = useState(deals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Track the target stage via ref to avoid closure stale-state bug
  const pendingMove = useRef<{ dealId: string; stageId: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeDeal = activeId ? items.find((d) => d.id === activeId) : null

  function getDealsByStage(stageId: string) {
    return items.filter((d) => d.stage_id === stageId).sort((a, b) => a.position - b.position)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    pendingMove.current = null
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    setOverId(overId)

    const overStage = stages.find((s) => s.id === overId)
    const overDeal = items.find((d) => d.id === overId)
    const newStageId = overStage?.id ?? overDeal?.stage_id

    if (!newStageId) return

    const activeDeal = items.find((d) => d.id === activeId)
    if (!activeDeal || activeDeal.stage_id === newStageId) return

    // Record pending move in ref (immune to stale closure)
    pendingMove.current = { dealId: activeId, stageId: newStageId }

    // Optimistic UI update
    setItems((prev) =>
      prev.map((d) => (d.id === activeId ? { ...d, stage_id: newStageId } : d))
    )
  }

  async function handleDragEnd(_event: DragEndEvent) {
    setActiveId(null)
    setOverId(null)

    const move = pendingMove.current
    pendingMove.current = null

    if (!move) return

    // Persist to database
    await moveDeal(move.dealId, move.stageId, null, null)
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverId(null)
    pendingMove.current = null
    setItems(deals) // Reset to original
  }

  const overStageId = stages.find((s) => s.id === overId)?.id
    ?? items.find((d) => d.id === overId)?.stage_id

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
        {stages.map((stage) => (
          <DroppableColumn
            key={stage.id}
            stage={stage}
            deals={getDealsByStage(stage.id)}
            isOver={overStageId === stage.id && activeId !== null}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeDeal && <DealCard deal={activeDeal} dragging />}
      </DragOverlay>
    </DndContext>
  )
}
