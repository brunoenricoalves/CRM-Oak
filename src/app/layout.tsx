import type { Metadata } from 'next'
import { Syne, DM_Sans, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const syne = Syne({ variable: '--font-syne', subsets: ['latin'], weight: ['400', '600', '700', '800'] })
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oak CRM',
  description: 'CRM by Oak Agência',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}>
      <Script src="/theme-init.js" strategy="beforeInteractive" />
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
