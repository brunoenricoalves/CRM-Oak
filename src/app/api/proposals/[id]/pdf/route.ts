// src/app/api/proposals/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { ProposalPdf } from '@/components/proposals/proposal-pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const orgId = await getActiveOrgId()
  if (!orgId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createClient()
  const { data: proposal, error: queryError } = await supabase
    .from('proposals')
    .select('id, title, proposal_items(service, description, value, position)')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (queryError || !proposal) return new NextResponse('Not found', { status: 404 })

  const items = ((proposal.proposal_items ?? []) as {
    service: string
    description: string | null
    value: number
    position: number
  }[]).sort((a, b) => a.position - b.position)

  const logoPath = path.join(process.cwd(), 'public', 'logo-oak.png')
  let logoBase64: string
  try {
    const logoBuffer = await fs.promises.readFile(logoPath)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch {
    return new NextResponse('Logo not found', { status: 500 })
  }

  let buffer: Buffer
  try {
    buffer = await renderToBuffer(
      React.createElement(ProposalPdf, { title: proposal.title, items, logoBase64 })
    )
  } catch {
    return new NextResponse('PDF generation failed', { status: 500 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta.pdf"`,
    },
  })
}
