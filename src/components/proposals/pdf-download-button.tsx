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
        gap: 4,
        padding: '4px 10px',
        height: 32,
        borderRadius: 8,
        color: 'var(--text-secondary)',
        background: 'rgba(37,99,235,0.1)',
        border: '1px solid rgba(37,99,235,0.2)',
        textDecoration: 'none',
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 500,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,99,235,0.2)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,99,235,0.1)' }}
    >
      <Download size={14} />
      PDF
    </a>
  )
}
