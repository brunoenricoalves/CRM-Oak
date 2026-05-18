'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { TagBadge } from './tag-badge'
import {
  addTagToContact,
  removeTagFromContact,
  addTagToCompany,
  removeTagFromCompany,
  addTagToDeal,
  removeTagFromDeal,
} from '@/server/actions/tag'

interface Tag {
  id: string
  name: string
  color: string
}

type EntityType = 'contact' | 'company' | 'deal'

interface TagPickerProps {
  entityType: EntityType
  entityId: string
  assignedTags: Tag[]
  allTags: Tag[]
}

export function TagPicker({ entityType, entityId, assignedTags, allTags }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const assignedIds = new Set(assignedTags.map((t) => t.id))
  const available = allTags.filter((t) => !assignedIds.has(t.id))

  function addTag(tagId: string) {
    startTransition(() => {
      if (entityType === 'contact') addTagToContact(entityId, tagId)
      else if (entityType === 'company') addTagToCompany(entityId, tagId)
      else addTagToDeal(entityId, tagId)
    })
    setOpen(false)
  }

  function removeTag(tagId: string) {
    startTransition(() => {
      if (entityType === 'contact') removeTagFromContact(entityId, tagId)
      else if (entityType === 'company') removeTagFromCompany(entityId, tagId)
      else removeTagFromDeal(entityId, tagId)
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {assignedTags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
      ))}
      {available.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" /> Tag
          </button>
          {open && (
            <div className="absolute left-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[160px] max-h-56 overflow-y-auto">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-slate-50 text-left"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-slate-700">{tag.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {assignedTags.length === 0 && available.length === 0 && (
        <span className="text-xs text-slate-400">Nenhuma tag criada</span>
      )}
    </div>
  )
}
