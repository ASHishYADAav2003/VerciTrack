// app/layout.tsx
import type { Metadata } from 'next'
import PublicNav from '@/components/PublicNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'HAV — Coffee Authenticity Verification',
  description: 'Blockchain-verified coffee traceability platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <PublicNav />
        {children}
      </body>
    </html>
  )
}
