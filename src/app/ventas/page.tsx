'use client'

import React, { useState, useEffect } from 'react'
// Importación corregida basada en tu ruta específica: app/ventas/components/sale-form.tsx
import { SaleForm } from './components/sale-form' 
import { Button } from '@/components/ui/button'
import { Plus, ShoppingBag, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Interfaz para el tipado de productos - Sincronizada con el monitor
export interface Product {
  id: string
  name: string
  price: number
  stock: number
  unit: string
  status: 'active' | 'inactive'
}

export default function VentasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saleCount, setSaleCount] = useState(0)
  const { toast } = useToast()

  // Tasa de cambio (puedes ajustarla según tu necesidad)
  const bcvRate = 36.50 

  // Carga de productos para el monitor
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        // Simulación de carga de datos desde la DB
        setTimeout(() => {
          setProducts([
            { id: '1', name: 'Harina PAN', price: 1.2, stock: 50, unit: 'kg', status: 'active' },
            { id: '2', name: 'Arroz Primor', price: 1.1, stock: 30, unit: 'unid', status: 'active' },
            { id: '3', name: 'Azúcar Montalbán', price: 1.0, stock: 20, unit: 'kg', status: 'active' },
          ])
          setIsLoading(false)
        }, 800)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error de conexión',
          description: 'No se pudieron cargar los productos para la venta.'
        })
      }
    }

    fetchProducts()
  }, [toast])

  const handleSaleSubmit = async (saleData: any) => {
    try {
      console.log('Datos recibidos del monitor:', saleData)
      
      // Simulación de proceso de guardado
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSaleCount(prev => prev + 1)
      setIsFormOpen(false)
      
      toast({
        title: '¡Venta Exitosa!',
        description: `Operación #${saleData.saleNumber} registrada correctamente.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar',
        description: 'No se pudo guardar la venta en el sistema.'
      })
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Encabezado Superior */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-[#107C41] p-3 rounded-2xl">
            <ShoppingBag className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Ventas</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Panel de control de transacciones</p>
          </div>
        </div>

        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-[#107C41] hover:bg-[#0D6334] text-white font-black px-8 h-14 rounded-2xl shadow-lg shadow-[#107C41]/20 transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" /> NUEVA VENTA
        </Button>
      </div>

      {/* Cuerpo Principal (Historial) */}
      <div className="grid place-items-center h-[50vh] border-4 border-dashed border-slate-200 rounded-[4rem] opacity-50 bg-slate-50/50">
        <div className="text-center">
          {isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin text-[#107C41] mx-auto mb-4" />
          ) : (
            <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          )}
          <p className="text-slate-400 font-black uppercase tracking-widest">
            {isLoading ? 'Cargando datos...' : 'El historial de ventas se mostrará aquí'}
          </p>
        </div>
      </div>

      {/* Llamada al Formulario de Pantalla Completa */}
      <SaleForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSaleSubmit}
        products={products}
        isLoadingProducts={isLoading}
        bcvRate={bcvRate}
        saleCount={saleCount}
      />
    </div>
  )
}
