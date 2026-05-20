import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { getActiveOrgId } from '@/lib/org'
import { ProposalPdf } from '@/components/proposals/proposal-pdf'

export async function POST(req: NextRequest) {
  const orgId = await getActiveOrgId()
  if (!orgId) return new NextResponse('Unauthorized', { status: 401 })

  let body: { title?: unknown; items?: unknown }
  try {
    body = await req.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : 'Proposta'

  const clientName =
    typeof (body as { clientName?: unknown }).clientName === 'string'
      ? (body as { clientName: string }).clientName
      : null

  const rawItems = Array.isArray(body.items) ? body.items : []
  const items = rawItems
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it) => ({
      service: typeof it.service === 'string' ? it.service : '—',
      description: typeof it.description === 'string' && it.description ? it.description : null,
      value: parseFloat(String(it.value)) || 0,
    }))
    .filter((it) => it.value > 0)

  if (items.length === 0) return new NextResponse('No valid items', { status: 400 })

  const logoPath = path.join(process.cwd(), 'public', 'logo-oak.png')
  let logoBase64: string
  try {
    const buf = await fs.promises.readFile(logoPath)
    logoBase64 = `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return new NextResponse('Logo not found', { status: 500 })
  }

  let buffer: Buffer
  try {
    buffer = await renderToBuffer(
      React.createElement(ProposalPdf, { title, clientName, items, logoBase64 })
    )
  } catch {
    return new NextResponse('PDF generation failed', { status: 500 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="proposta-preview.pdf"',
    },
  })
}
