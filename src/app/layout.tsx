import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { FirebaseClientProvider } from '@/firebase'
import { AuthGuard } from '@/components/auth-guard'

// Configuración de la fuente Montserrat optimizada
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Full-Ventas',
  description: 'Sistema profesional de gestión de inventario y ventas',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-512x512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a3025',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={montserrat.variable}>
      <body className={cn(
        'font-body antialiased min-h-screen bg-background',
        montserrat.className
      )}>
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
