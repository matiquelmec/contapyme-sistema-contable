import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { RedirectHandler } from '@/components/auth/RedirectHandler'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'ContaPyme - Sistema Contable Integral',
  description: 'Plataforma contable completa para PyMEs con dashboard financiero, balances y proyecciones',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <RedirectHandler />
        <CompanyProvider>
          {children}
        </CompanyProvider>
      </body>
    </html>
  )
}