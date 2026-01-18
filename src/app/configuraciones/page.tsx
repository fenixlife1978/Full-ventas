'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, DollarSign, Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import Layout from '../layout-app'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useDoc } from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'


export interface Setting {
  id: string
  bcvRate: number
  logoUrl?: string
}

export default function ConfiguracionesPage() {
  const [bcvRate, setBcvRate] = useState<number | ''>('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const firestore = useFirestore()

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: settings, isLoading } = useDoc<Setting>(settingsDocRef)

  useEffect(() => {
    if (settings) {
      if (settings.bcvRate) {
        setBcvRate(settings.bcvRate)
      }
      if (settings.logoUrl) {
        setLogoPreview(settings.logoUrl)
      } else {
        setLogoPreview(null)
      }
    }
  }, [settings])
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 200
          const MAX_HEIGHT = 200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL(file.type, 0.8) // 80% quality compression
          setLogoPreview(dataUrl)
        }
        img.src = result
      }
      reader.readAsDataURL(file)
    } else if (file) {
      toast({
        variant: 'destructive',
        title: 'Archivo inválido',
        description: 'Por favor, selecciona una imagen JPG o PNG.',
      })
    }
  }


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
      const settingsData: { bcvRate: number, logoUrl?: string | null } = { 
        bcvRate: Number(bcvRate),
        logoUrl: logoPreview 
      };

      await setDoc(doc(firestore, 'settings', 'global'), settingsData, { merge: true })
      toast({
        title: 'Configuración Guardada',
        description: 'La configuración ha sido actualizada.',
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
            <CardTitle>Ajustes Generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                 <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-64 mb-4" />
                    <Skeleton className="h-10 w-full" />
                 </div>
                 <Separator />
                 <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-64 mb-4" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </div>
                 </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-foreground">Tasa de Cambio</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Establece la tasa de cambio del Banco Central de Venezuela (BCV) para las conversiones de moneda.
                  </p>
                  <div className="relative max-w-sm">
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
                </div>
                
                <Separator />

                <div>
                   <h3 className="font-semibold text-foreground">Logo de la Empresa</h3>
                   <p className="text-sm text-muted-foreground mb-4">
                     Sube el logo de tu empresa (JPG o PNG). Se mostrará en la barra lateral.
                   </p>
                   <div className="flex items-center gap-6">
                     <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                       {logoPreview ? (
                         <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                       ) : (
                         <ImageIcon className="h-12 w-12 text-muted-foreground" />
                       )}
                     </div>
                     <div className="flex flex-col gap-2">
                       <Button onClick={() => fileInputRef.current?.click()}>
                         <Upload className="mr-2 h-4 w-4" />
                         Cambiar Logo
                       </Button>
                       <input
                         type="file"
                         ref={fileInputRef}
                         onChange={handleFileChange}
                         className="hidden"
                         accept="image/png, image/jpeg"
                       />
                       {logoPreview && (
                         <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setLogoPreview(null)}>
                           <Trash2 className="mr-2 h-4 w-4" />
                           Eliminar
                         </Button>
                       )}
                     </div>
                   </div>
                </div>

              </>
            )}
          </CardContent>
        </Card>
        
        <div className="max-w-2xl flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
        </div>

      </div>
    </Layout>
  )
}
