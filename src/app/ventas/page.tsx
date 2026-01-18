'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SaleForm } from './components/sale-form'
import { Button } from '@/components/ui/button'
import { Plus, ShoppingBag, Loader2, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc, Timestamp, runTransaction, deleteDoc } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { type Product } from '../productos/page'
import { type Setting } from '../configuraciones/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Layout from '@/app/layout-app'
import { format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface Sale {
  id: string
  saleNumber: number
  items: SaleItem[]
  totalAmount: number
  saleDate: Date
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other'
}

export default function VentasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isClient, setIsClient] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      // Use replace to remove the query param from the URL without adding to history
      router.replace('/ventas', { scroll: false })
    }
  }, [searchParams, router])

  const { toast } = useToast()
  const firestore = useFirestore()

  const salesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'sales')
  }, [firestore])

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'products')
  }, [firestore])

  const settingsDoc = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)

  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])

  const formattedSales = useMemo(() => {
    return sales?.map(sale => ({
      ...sale,
      saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : sale.saleDate
    })).sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime()) || []
  }, [sales])

  const filteredSales = useMemo(() => {
    if (!searchTerm) return formattedSales
    return formattedSales.filter(sale =>
      String(sale.saleNumber).includes(searchTerm) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [formattedSales, searchTerm])

  const dailyStats = useMemo(() => {
    if (!isClient) return { totalSales: 0, totalRevenue: 0 };
    const todayStart = startOfDay(new Date())
    const todaysSales = formattedSales.filter(s => s.saleDate >= todayStart)
    const totalRevenueCents = todaysSales.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)
    
    return {
      totalSales: todaysSales.length,
      totalRevenue: totalRevenueCents / 100,
    }
  }, [formattedSales, isClient])

  const handleSaleSubmit = async (saleData: any) => {
    if (!firestore) return
    
    const dataToSave = {
      ...saleData,
      saleDate: Timestamp.fromDate(saleData.saleDate),
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const salesRef = doc(collection(firestore, 'sales'))
        
        for (const item of saleData.items) {
          const productRef = doc(firestore, 'products', item.productId)
          const productDoc = await transaction.get(productRef)

          if (!productDoc.exists()) {
            throw new Error(`Producto "${item.productName}" no encontrado.`)
          }
          
          const currentStock = productDoc.data().stock
          if (currentStock < item.quantity) {
            throw new Error(`Stock insuficiente para "${item.productName}". Disponible: ${currentStock}`)
          }
          
          const newStock = currentStock - item.quantity
          transaction.update(productRef, { stock: newStock })
        }
        
        transaction.set(salesRef, dataToSave)
      })

      toast({
        title: '¡Venta Exitosa!',
        description: `Operación #${dataToSave.saleNumber} registrada correctamente.`,
      })
      setIsFormOpen(false)

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar la venta',
        description: error.message || 'Ocurrió un error inesperado.',
      })
    }
  }
  
  const handleDelete = (sale: Sale) => {
    setDeletingSale(sale);
  }

  const confirmDelete = async () => {
    if (!deletingSale || !firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const saleRef = doc(firestore, 'sales', deletingSale.id);

        for (const item of deletingSale.items) {
          const productRef = doc(firestore, 'products', item.productId);
          const productDoc = await transaction.get(productRef);
          
          if (productDoc.exists()) {
            const currentStock = productDoc.data().stock;
            const newStock = currentStock + item.quantity;
            transaction.update(productRef, { stock: newStock });
          }
        }
        
        transaction.delete(saleRef);
      });

      toast({
        title: 'Venta Anulada',
        description: `La venta #${deletingSale.saleNumber} ha sido eliminada y el stock ha sido restaurado.`,
      });

    } catch (error) {
       toast({
        variant: "destructive",
        title: 'Error al anular',
        description: `No se pudo anular la venta.`,
      });
    }

    setDeletingSale(null);
  }


  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES' && bcvRate) {
      value = value * bcvRate
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)}`
    }
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
    // @ts-ignore
    return labels[method] || 'Otro';
  };

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingSettings;

  return (
    <Layout currentPageName="Ventas">
      <div className="p-4 md:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              <ShoppingBag className="w-8 h-8" />
              Ventas
            </h1>
            <p className="text-muted-foreground mt-2">Panel de control de transacciones</p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-xl uppercase tracking-tighter italic shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
            Nueva Venta
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || !isClient ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{dailyStats.totalSales}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ingresos de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || !isClient ? <Skeleton className="h-8 w-32" /> : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(dailyStats.totalRevenue, 'USD')}</div>
                  {bcvRate && <p className="text-xs text-muted-foreground">{formatCurrency(dailyStats.totalRevenue, 'VES')}</p>}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Ventas</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Nº de Venta o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left font-semibold">Nº Venta</th>
                    <th className="p-3 text-left font-semibold">Fecha</th>
                    <th className="p-3 text-left font-semibold">Items</th>
                    <th className="p-3 text-left font-semibold">Pago</th>
                    <th className="p-3 text-right font-semibold">Total</th>
                    <th className="p-3 text-center font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading || !isClient ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b"><td colSpan={6} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                    ))
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        {searchTerm ? 'No se encontraron ventas.' : 'Aún no hay ventas registradas.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="border-b hover:bg-muted">
                        <td className="p-3 font-mono text-primary">#{sale.saleNumber}</td>
                        <td className="p-3 text-muted-foreground">{format(sale.saleDate, 'dd/MM/yy HH:mm')}</td>
                        <td className="p-3">
                          <div className='flex flex-col'>
                            {sale.items.map(item => (
                              <span key={item.productId} className="text-xs">
                                {item.quantity} x {item.productName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3"><Badge variant="outline">{getPaymentMethodLabel(sale.paymentMethod)}</Badge></td>
                        <td className="p-3 text-right">
                           <div className="font-bold">{formatCurrency(sale.totalAmount, 'USD')}</div>
                           {bcvRate && <div className="text-xs text-muted-foreground">{formatCurrency(sale.totalAmount, 'VES')}</div>}
                        </td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(sale)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <SaleForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleSaleSubmit}
          products={products || []}
          isLoadingProducts={isLoadingProducts}
          bcvRate={bcvRate}
          saleCount={sales?.length || 0}
        />
        
        <AlertDialog open={!!deletingSale} onOpenChange={(open) => !open && setDeletingSale(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Anular Venta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Anulará la venta #{deletingSale?.saleNumber} y devolverá los productos al inventario.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Sí, Anular y Devolver Stock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </Layout>
  )
}
