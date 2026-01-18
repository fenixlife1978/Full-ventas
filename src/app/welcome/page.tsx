'use client'

import Link from 'next/link'
import { Hand, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { useEffect } from 'react'
import { type Setting } from '../configuraciones/page'

export default function WelcomePage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: settings } = useDoc<Setting>(settingsDocRef)

  // Obtenemos el año directamente; en Client Components esto es seguro 
  // ya que el componente se hidrata en el cliente.
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/')
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || user) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-background text-foreground p-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-48 h-48 mb-12 rounded-full bg-sidebar flex items-center justify-center overflow-hidden border-4 border-primary/30 shadow-2xl">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="h-24 w-24 text-primary/50" />
          )}
        </div>

        <Link
          href="/login"
          aria-label="Ir a inicio de sesión"
          className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center animate-pulse border-2 border-primary/50 hover:bg-primary/40 hover:animate-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Hand className="w-10 h-10 text-primary" />
        </Link>
      </div>
      <footer className="text-center text-xs text-muted-foreground py-4">
        © {year} Full-Ventas. Todos los derechos reservados.
      </footer>
    </div>
  )
}
