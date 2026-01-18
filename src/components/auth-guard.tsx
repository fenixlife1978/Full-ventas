'use client'

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { doc } from 'firebase/firestore'
import { type Setting } from '@/app/configuraciones/page'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  const firestore = useFirestore()
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])
  const { data: settings, isLoading: isLoadingSettings } =
    useDoc<Setting>(settingsDocRef)

  useEffect(() => {
    if (isUserLoading) {
      return // Wait until auth state is resolved
    }

    const isPublicPage = pathname === '/login' || pathname === '/welcome'

    // If user is not logged in and not on a public page, redirect to welcome
    if (!user && !isPublicPage) {
      router.replace('/welcome')
    }

    // If user is logged in and on a public page, redirect to dashboard
    if (user && isPublicPage) {
      router.replace('/')
    }
  }, [user, isUserLoading, pathname, router])

  const isPublicPage = pathname === '/login' || pathname === '/welcome'
  // Show a loader while checking auth state or if a redirect is imminent
  if (isUserLoading || (!user && !isPublicPage) || (user && isPublicPage)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-sidebar flex items-center justify-center overflow-hidden border-4 border-primary/30 shadow-lg animate-pulse">
            {isLoadingSettings ? (
              <div />
            ) : settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo de la empresa"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <svg
                role="img"
                aria-label="Full-Ventas Logo"
                className="w-full h-full p-2"
                viewBox="0 0 64 64"
              >
                <defs>
                  <linearGradient id="logo-gold" x1="0.5" y1="0" x2="0.5" y2="1">
                    <stop offset="0" stopColor="#e4b335" />
                    <stop offset="1" stopColor="#b0881a" />
                  </linearGradient>
                  <linearGradient
                    id="shield-gradient"
                    x1="0.5"
                    y1="0"
                    x2="0.5"
                    y2="1"
                  >
                    <stop offset="0" stopColor="#2b5040" />
                    <stop offset="1" stopColor="#1a3025" />
                  </linearGradient>
                </defs>
                <path
                  d="M32 2C52 8 62 26 62 38 62 52 48 62 32 62 16 62 2 52 2 38 2 26 12 8 32 2z"
                  fill="url(#shield-gradient)"
                  stroke="url(#logo-gold)"
                  strokeWidth="4"
                />
                <text
                  x="32"
                  y="58"
                  fill="url(#logo-gold)"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  $
                </text>
                <g
                  transform="translate(1 0)"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 24 H 15 L 19 40 H 45 L 49 28 H 17" />
                  <circle cx="22" cy="43" r="3" />
                  <circle cx="39" cy="43" r="3" />
                  <path d="M23 39 V 31" />
                  <path d="M29 39 V 25" />
                  <path d="M35 39 V 33" />
                  <path d="M41 39 V 22" />
                  <path d="M23 31 L 29 25 L 35 33 L 41 22 L 48 16" />
                  <path d="M45 15 L 48 16 L 47 19" />
                </g>
              </svg>
            )}
          </div>
          <p className="text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  // If auth state is resolved and no redirect is needed, render the children
  return <>{children}</>
}
