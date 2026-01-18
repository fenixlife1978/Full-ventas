'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Mail, Lock, Image as ImageIcon } from 'lucide-react'
import { type Setting } from '../configuraciones/page'


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()

  const firestore = useFirestore()
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])
  const { data: settings } = useDoc<Setting>(settingsDocRef)

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/')
    }
  }, [user, isUserLoading, router])


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/')
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: 'Correo electrónico o contraseña incorrectos.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isUserLoading || user) {
     return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            {/* You can add a spinner or skeleton loader here */}
        </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-2xl border-none bg-card">
        <CardHeader className="p-0 relative flex items-center justify-center mb-6">
            <div className="absolute top-0 -translate-y-1/2 bg-card h-32 w-32 rounded-full shadow-lg border-8 border-background flex items-center justify-center overflow-hidden">
                {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
                ) : (
                    <ImageIcon className="h-16 w-16 text-primary/50" />
                )}
            </div>
        </CardHeader>
        <CardContent className="pt-20">
          <form onSubmit={handleLogin} className="space-y-6">
             <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground uppercase">Bienvenido</h1>
                <p className="text-muted-foreground">Inicia sesión para continuar</p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    id="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    />
                </div>
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                    />
                </div>
                </div>
            </div>
            <Button type="submit" className="w-full uppercase font-bold" disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
