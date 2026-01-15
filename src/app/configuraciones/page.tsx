'use client'

import { useState, useEffect } from 'react'
import { Settings, DollarSign, Save } from 'lucide-react'
import Layout from '../layout-app'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useDoc } from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { Skeleton } from '@/components/ui/skeleton'

export interface Setting {
  id: string
  bcvRate: number
}

export default function ConfiguracionesPage() {
  const [bcvRate, setBcvRate] = useState<number | ''>('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const firestore = useFirestore()

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: settings, isLoading } = useDoc<Setting>(settingsDocRef)

  useEffect(() => {
    if (settings && settings.bcvRate) {
      setBcvRate(settings.bcvRate)
    }
  }, [settings])

  const handleSave = async () => {
    if (!firestore) return
    if (typeof bcvRate !== 'number' || bcvRate <= 0) {
      toast({
        variant: 'destructive',
        title: 'Tasa inválida',
        description: 'Por favor, introduce un valor numérico positivo para la tasa BCV.',
      })
      return
    }

    setIsSaving(true)
    try {
      await setDoc(doc(firestore, 'settings', 'global'), { bcvRate })
      toast({
        title: 'Configuración Guardada',
        description: 'La tasa de cambio BCV ha sido actualizada.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo guardar la configuración. Inténtalo de nuevo.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout currentPageName="Configuraciones">
      <div className="space-y-6 p-4 md:p-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Configuraciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona la configuración general de la aplicación.
          </p>
        </header>

        <Card className="max-w-2xl bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Tasa de Cambio</CardTitle>
            <CardDescription>
              Establece la tasa de cambio del Banco Central de Venezuela (BCV) para las conversiones de moneda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="bcv-rate"
                    type="number"
                    placeholder="Introduce la tasa BCV"
                    value={bcvRate}
                    onChange={(e) => setBcvRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="pl-10 border-border/50 focus:ring-ring"
                  />
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
