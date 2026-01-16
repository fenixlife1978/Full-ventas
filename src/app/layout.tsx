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
  // Configuración para que se vea bien en WhatsApp/Redes Sociales
  openGraph: {
    title: 'Full-Ventas',
    description: 'Gestiona tu negocio de forma inteligente',
    url: 'https://tu-proyecto.vercel.app', // Reemplaza con tu URL real de Vercel
    siteName: 'Full-Ventas',
    images: [
      {
        url: 'https://tu-proyecto.vercel.app/og-image.png', // URL absoluta necesaria
        width: 1200,
        height: 630,
        alt: 'Full-Ventas Logo',
      },
    ],
    locale: 'es_VE',
    type: 'website',
  },
  // Iconos para la pestaña y dispositivos móviles
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon-192x192.png',
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
        {/* Color de la barra de direcciones en móviles */}
        <meta name="theme-color" content="#147B5C" />
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
