'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
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

interface KanbanBoardProps {
  stages: Stage[]
  deals: Deal[]
}

function SortableDealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} />
    </div>
  )
}

export function KanbanBoard({ stages, deals }: KanbanBoardProps) {
  const [items, setItems] = useState(deals)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeDeal = activeId ? items.find((d) => d.id === activeId) : null

  function getDealsByStage(stageId: string) {
    return items.filter((d) => d.stage_id === stageId).sort((a, b) => a.position - b.position)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeItemId = active.id as string
    const overId = over.id as string

    const activeDealItem = items.find((d) => d.id === activeItemId)
    if (!activeDealItem) return

    const overStage = stages.find((s) => s.id === overId)
    const overDeal = items.find((d) => d.id === overId)

    const newStageId = overStage?.id ?? overDeal?.stage_id

    if (newStageId && activeDealItem.stage_id !== newStageId) {
      setItems((prev) =>
        prev.map((d) => (d.id === activeItemId ? { ...d, stage_id: newStageId } : d))
      )
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active } = event
    setActiveId(null)

    const activeItemId = active.id as string
    const activeDealItem = items.find((d) => d.id === activeItemId)
    if (!activeDealItem || !activeDealItem.stage_id) return

    const stageDeals = getDealsByStage(activeDealItem.stage_id)
    const activeIndex = stageDeals.findIndex((d) => d.id === activeItemId)

    const before = stageDeals[activeIndex - 1]?.position ?? null
    const after = stageDeals[activeIndex + 1]?.position ?? null

    await moveDeal(activeItemId, activeDealItem.stage_id, before, after)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id)
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color ?? '#94a3b8' }}
                />
                <h3 className="font-medium text-slate-700 text-sm">{stage.name}</h3>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {stageDeals.length}
                </span>
              </div>
              <SortableContext
                id={stage.id}
                items={stageDeals.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="bg-slate-100 rounded-lg p-2 min-h-24 space-y-2">
                  {stageDeals.map((deal) => (
                    <SortableDealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>
      <DragOverlay>{activeDeal && <DealCard deal={activeDeal} />}</DragOverlay>
    </DndContext>
  )
}
