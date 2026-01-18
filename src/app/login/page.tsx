'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Mail, Lock } from 'lucide-react'
import { useEffect } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()

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
            <div className="absolute top-0 -translate-y-1/2 bg-card h-32 w-32 rounded-full shadow-lg border-8 border-background flex items-center justify-center">
                 <svg
                    role="img"
                    aria-label="Full-Ventas Logo"
                    className="w-20 h-20"
                    viewBox="0 0 64 64"
                    >
                    <defs>
                        <linearGradient id="logo-gold" x1="0.5" y1="0" x2="0.5" y2="1">
                          <stop offset="0" stopColor="#e4b335" />
                          <stop offset="1" stopColor="#b0881a" />
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
                        fill="hsl(var(--card))"
                        stroke="none"
                    />
                    <g
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M16 48l3-18h31l-4.5 13H19" />
                        <circle cx="22" cy="53" r="3" fill="hsl(var(--primary))" stroke="none" />
                        <circle cx="43" cy="53" r="3" fill="hsl(var(--primary))" stroke="none" />
                        <path d="M16 30l-3-9" />
                        <path d="M22 42v-8m8 8v-12m8 12v-16" />
                        <path d="M24 30l12-10 12 4" />
                        <path d="M42 21l4-5-5-2" />
                    </g>
                    <text
                        x="32.5"
                        y="56"
                        fill="url(#logo-gold)"
                        stroke="#6c4e06"
                        strokeWidth="0.5"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                    >
                        $
                    </text>
                </svg>
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
