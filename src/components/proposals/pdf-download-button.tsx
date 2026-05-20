// src/components/proposals/pdf-download-button.tsx
import { Download } from 'lucide-react'

interface PdfDownloadButtonProps {
  proposalId: string
}

export function PdfDownloadButton({ proposalId }: PdfDownloadButtonProps) {
  return (
    <a
      href={`/api/proposals/${proposalId}/pdf`}
      target="_blank"
      rel="noreferrer"
      title="Baixar PDF"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        color: 'var(--text-dim)',
        background: 'none',
        border: 'none',
        textDecoration: 'none',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#2563eb')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-dim)')}
    >
      <Download size={16} />
    </a>
  )
}
