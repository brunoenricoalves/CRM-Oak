'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { Plus, Trash2, Eye } from 'lucide-react'
import { createProposal } from '@/server/actions/proposal'
import { PROPOSAL_SERVICES } from '@/lib/validations/proposal'

interface Item {
  service: string
  description: string
  value: string
}

interface ProposalFormProps {
  dealId: string
  contactId?: string | null
  companyId?: string | null
  companyName?: string | null
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="px-4 rounded-lg text-sm font-medium transition-all"
      style={{
        minHeight: 40,
        background: pending || disabled ? 'rgba(37,99,235,0.4)' : '#2563eb',
        color: '#ffffff',
        border: 'none',
        opacity: pending || disabled ? 0.7 : 1,
      }}
    >
      {pending ? 'Registrando…' : 'Registrar como enviada'}
    </button>
  )
}

const emptyItem = (): Item => ({ service: PROPOSAL_SERVICES[0], description: '', value: '' })

export function ProposalForm({ dealId, contactId, companyId, companyName }: ProposalFormProps) {
  const [state, formAction] = useActionState(createProposal, null)
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [notes, setNotes] = useState('')
  const [title, setTitle] = useState(
    companyName ? `Proposta Oak – ${companyName}` : 'Proposta Oak'
  )
  const [isPreviewing, setIsPreviewing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      setItems([emptyItem()])
      setNotes('')
      setTitle(companyName ? `Proposta Oak – ${companyName}` : 'Proposta Oak')
      toast.success('Proposta registrada')
    }
    if (state?.error) toast.error(state.error)
  }, [state, companyName])

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof Item, val: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: val } : it)))
  }

  const total = items.reduce((sum, it) => sum + (parseFloat(it.value) || 0), 0)
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const hasItems = items.every((it) => it.service && it.value)

  async function handlePreview() {
    const validItems = items.filter((it) => it.service && parseFloat(it.value) > 0)
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item com valor para gerar o PDF')
      return
    }
    // Open tab synchronously before the first await to avoid popup blockers
    const win = window.open('', '_blank')
    setIsPreviewing(true)
    try {
      const res = await fetch('/api/proposals/preview/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, clientName: companyName ?? null, items: validItems }),
      })
      if (!res.ok) throw new Error('Falha ao gerar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (win) {
        win.location.href = url
      } else {
        window.open(url, '_blank')
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      win?.close()
      toast.error('Erro ao gerar preview do PDF')
    } finally {
      setIsPreviewing(false)
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="deal_id" value={dealId} />
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {/* Title */}
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da proposta"
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--surface-border)',
          color: 'var(--text-primary)',
        }}
      />

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <select
              value={item.service}
              onChange={(e) => updateItem(i, 'service', e.target.value)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
                minWidth: 140,
              }}
            >
              {PROPOSAL_SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input
              value={item.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              placeholder="Descrição (opcional)"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
              }}
            />

            <input
              type="number"
              value={item.value}
              onChange={(e) => updateItem(i, 'value', e.target.value)}
              placeholder="Valor"
              min="0"
              step="0.01"
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
                width: 120,
              }}
            />

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                style={{ color: 'var(--text-dim)', background: 'none', border: 'none', padding: '8px 4px', minHeight: 40 }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add item + total */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: '#2563eb', background: 'none', border: 'none', padding: 0 }}
        >
          <Plus className="w-4 h-4" />
          Adicionar serviço
        </button>
        {total > 0 && (
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Total: {fmt(total)}
          </span>
        )}
      </div>

      {/* Notes */}
      <textarea
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observações internas (opcional)"
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-sm resize-none"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--surface-border)',
          color: 'var(--text-primary)',
        }}
      />

      <div className="flex items-center gap-2">
        <SubmitButton disabled={!hasItems} />
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewing}
          className="flex items-center gap-1.5 px-4 rounded-lg text-sm font-medium transition-all"
          style={{
            minHeight: 40,
            background: 'transparent',
            color: isPreviewing ? 'var(--text-dim)' : 'var(--text-secondary)',
            border: '1px solid var(--surface-border)',
            cursor: isPreviewing ? 'not-allowed' : 'pointer',
            opacity: isPreviewing ? 0.6 : 1,
          }}
        >
          <Eye className="w-4 h-4" />
          {isPreviewing ? 'Gerando…' : 'Preview PDF'}
        </button>
      </div>
    </form>
  )
}
