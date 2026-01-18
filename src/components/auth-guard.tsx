'use client'

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { doc } from 'firebase/firestore'
import { type Setting } from '@/app/configuraciones/page'
import { Image as ImageIcon } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isClient, setIsClient] = useState(false)

  const firestore = useFirestore()
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDocRef)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || isUserLoading) return

    const isPublicPage = pathname === '/login' || pathname === '/welcome'

    if (!user && !isPublicPage) {
      router.replace('/welcome')
    }

    if (user && isPublicPage) {
      router.replace('/')
    }
  }, [user, isUserLoading, pathname, router, isClient])

  const isPublicPage = pathname === '/login' || pathname === '/welcome'
  
  const showLoader = !isClient || isUserLoading || isLoadingSettings || (!user && !isPublicPage) || (user && isPublicPage)

  if (showLoader) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-sidebar flex items-center justify-center overflow-hidden border-4 border-primary/30 shadow-lg animate-pulse">
            {isClient && !isLoadingSettings ? (
              settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo de la empresa"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-12 w-12 text-primary/50" />
              )
            ) : (
              <div />
            )}
          </div>
          <p className="text-muted-foreground animate-pulse text-sm">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  
  return <>{children}</>
}
