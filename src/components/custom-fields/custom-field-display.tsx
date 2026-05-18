'use client'

import { useState, useTransition } from 'react'
import { Check, Pencil } from 'lucide-react'
import { upsertCustomFieldValue } from '@/server/actions/custom-field'

interface FieldDef {
  id: string
  name: string
  field_type: string
  options: string[] | null
}

interface FieldValue {
  field_id: string
  value: string | null
}

type EntityType = 'contact' | 'company' | 'deal'

interface CustomFieldDisplayProps {
  entityId: string
  entityType: EntityType
  fieldDefs: FieldDef[]
  fieldValues: FieldValue[]
}

function FieldRow({
  def,
  value,
  entityId,
  entityType,
}: {
  def: FieldDef
  value: string | null
  entityId: string
  entityType: EntityType
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await upsertCustomFieldValue(def.id, entityId, draft, entityType)
    })
    setEditing(false)
  }

  const display = value || <span className="text-slate-400 italic">—</span>

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 w-32 shrink-0">{def.name}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          {def.field_type === 'select' && def.options ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 border border-slate-200 rounded px-2 py-0.5 text-sm"
              autoFocus
            >
              <option value="">—</option>
              {def.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : def.field_type === 'checkbox' ? (
            <input
              type="checkbox"
              checked={draft === 'true'}
              onChange={(e) => setDraft(e.target.checked ? 'true' : 'false')}
              className="h-4 w-4"
              autoFocus
            />
          ) : (
            <input
              type={def.field_type === 'date' ? 'date' : def.field_type === 'number' ? 'number' : 'text'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 border border-slate-200 rounded px-2 py-0.5 text-sm"
              autoFocus
            />
          )}
          <button onClick={save} className="text-blue-600 hover:text-blue-800">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 text-xs">
            ✕
          </button>
        </div>
      ) : (
        <div
          className="flex-1 flex items-center gap-1 group cursor-pointer"
          onClick={() => setEditing(true)}
        >
          <span className="text-slate-700">
            {def.field_type === 'checkbox'
              ? value === 'true' ? '✓ Sim' : '✗ Não'
              : display}
          </span>
          <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  )
}

export function CustomFieldDisplay({
  entityId,
  entityType,
  fieldDefs,
  fieldValues,
}: CustomFieldDisplayProps) {
  if (fieldDefs.length === 0) return null

  const valueMap = new Map(fieldValues.map((v) => [v.field_id, v.value]))

  return (
    <div className="space-y-2 pt-3 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Campos personalizados</p>
      {fieldDefs.map((def) => (
        <FieldRow
          key={def.id}
          def={def}
          value={valueMap.get(def.id) ?? null}
          entityId={entityId}
          entityType={entityType}
        />
      ))}
    </div>
  )
}
