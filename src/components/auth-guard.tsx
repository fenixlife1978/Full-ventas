'use client'

import { useUser } from '@/firebase/provider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

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

  const isPublicPage = pathname === '/login' || pathname === '/welcome';
  // Show a loader while checking auth state or if a redirect is imminent
  if (isUserLoading || (!user && !isPublicPage) || (user && isPublicPage)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <svg
                role="img"
                aria-label="Full-Ventas Logo"
                className="w-24 h-24 animate-pulse"
                viewBox="0 0 64 64"
                >
                <defs>
                    <linearGradient id="logo-gold" x1="0.5" y1="0" x2="0.5" y2="1">
                    <stop offset="0" stopColor="#f4d03f" />
                    <stop offset="1" stopColor="#b5830d" />
                    </linearGradient>
                    <linearGradient id="logo-green" x1="0.5" y1="0" x2="0.5" y2="1">
                    <stop offset="0" stopColor="#1dd1a1" />
                    <stop offset="1" stopColor="#108967" />
                    </linearGradient>
                </defs>
                <path
                    d="M32 2C52 8 62 26 62 38 62 52 48 62 32 62 16 62 2 52 2 38 2 26 12 8 32 2z"
                    stroke="url(#logo-gold)"
                    strokeWidth="4"
                    fill="none"
                />
                <path
                    d="M32 6C49 12 58 27 58 38c0 12-12 20-26 20S6 50 6 38C6 27 15 12 32 6z"
                    fill="url(#logo-green)"
                    stroke="none"
                />
            </svg>
            <p className="text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  // If auth state is resolved and no redirect is needed, render the children
  return <>{children}</>
}
