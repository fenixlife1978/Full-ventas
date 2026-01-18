import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { FirebaseClientProvider } from '@/firebase'
import { AuthGuard } from '@/components/auth-guard'

export const metadata: Metadata = {
  title: 'Full-Ventas',
  description: 'Sistema profesional de gestión de inventario y ventas',
  manifest: '/manifest.json',
  themeColor: '#226482',
  icons: {
    apple: '/icon-512x512.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased', 'min-h-screen bg-background')}>
        <FirebaseClientProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
