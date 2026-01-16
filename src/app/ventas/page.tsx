'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, ShoppingCart, DollarSign, Trash2, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc, Timestamp, runTransaction, addDoc } from 'firebase/firestore'
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
import { useMemoFirebase } from '@/firebase/provider'
import { type Product } from '../productos/page'
import Layout from '@/app/layout-app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { format } from 'date-fns'
import { type Setting } from '../configuraciones/page'


export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface Sale {
  id: string
  saleNumber: number;
  items: SaleItem[]
  totalAmount: number
  saleDate: Date
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other'
  notes?: string
}

export default function VentasPage() {
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
  const { toast } = useToast()
  const firestore = useFirestore()

  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  
  const salesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'sales')
  }, [firestore])

  const settingsDoc = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)
  
  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])

  const formattedSales = useMemo(() => {
    return sales?.map(sale => ({
      ...sale,
      saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : new Date(sale.saleDate)
    })).sort((a, b) => b.saleNumber - a.saleNumber) || []
  }, [sales])


  const filteredSales = useMemo(() => {
    let filtered = [...formattedSales]

    const now = new Date()
    const startOfToday = new Date(now.setHours(0, 0, 0, 0))
    const weekStartDate = startOfWeek(now)
    const monthStartDate = startOfMonth(now)

    if (dateFilter === 'today') {
        filtered = filtered.filter(s => s.saleDate >= startOfToday)
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(s => s.saleDate >= weekStartDate)
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(s => s.saleDate >= monthStartDate)
    }

    if (searchTerm) {
      filtered = filtered.filter(s => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          s.notes?.toLowerCase().includes(lowerSearchTerm) ||
          s.saleNumber.toString().includes(lowerSearchTerm) ||
          s.items.some(item => item.productName.toLowerCase().includes(lowerSearchTerm))
        )
      })
    }

    return filtered
  }, [formattedSales, searchTerm, dateFilter])


  const summaryStats = useMemo(() => {
    const totalSales = filteredSales.length
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    return { totalSales, totalRevenue }
  }, [filteredSales])


  const handleDelete = (sale: Sale) => {
    setDeletingSale(sale)
  }
  
  const confirmDelete = async () => {
    if (deletingSale && firestore) {
      const saleRef = doc(firestore, 'sales', deletingSale.id)
      
      try {
        await runTransaction(firestore, async (transaction) => {
          for (const item of deletingSale.items) {
            const productRef = doc(firestore, 'products', item.productId);
            const productDoc = await transaction.get(productRef);
            
            if(productDoc.exists()) {
              const currentStock = productDoc.data().stock;
              const newStock = currentStock + item.quantity;
              transaction.update(productRef, { stock: newStock });
            }
          }
          
          transaction.delete(saleRef);
        })
        toast({
          title: 'Venta Eliminada',
          description: 'La venta ha sido eliminada y el stock ha sido restaurado.',
        })
        setDeletingSale(null)
      } catch (error) {
         toast({
          variant: "destructive",
          title: 'Error al eliminar',
          description: 'No se pudo eliminar la venta y restaurar el stock.',
        });
      }
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      other: 'Otro',
    };
    return labels[method] || method;
  };
  
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

 const isLoading = isLoadingSales || isLoadingSettings;

  return (
    <Layout currentPageName="Gestión de Ventas">
      <div className="space-y-6 p-4 md:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Gestión de Ventas</h1>
            <p className="text-muted-foreground mt-2">Consulta y gestiona el historial de ventas</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              <Link href="/monitor-de-venta">
                <Plus className="mr-2" />
                Ir al Monitor de Venta
              </Link>
            </Button>
          </div>
        </header>

         {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ventas ({dateFilter === 'today' ? 'Hoy' : dateFilter === 'week' ? 'Esta Semana' : dateFilter === 'month' ? 'Este Mes' : 'Todas'})
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
             { isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold text-foreground">{summaryStats.totalSales}</div> }
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              { isLoading ? <Skeleton className="h-8 w-1/3" /> : <div className="text-2xl font-bold text-foreground">{formatCurrency(summaryStats.totalRevenue)}</div> }
            </CardContent>
          </Card>
        </div>


        {/* Filters */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por Nº Venta, producto o notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border/50 focus:ring-ring"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="border-border/50 focus:ring-ring">
                  <SelectValue placeholder="Filtrar por fecha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Sales List */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="bg-card border-border/50">
                    <CardContent className="p-6">
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            ))
          ) : filteredSales.length > 0 ? (
            filteredSales.map(sale => (
              <Card key={sale.id} className="bg-card border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-foreground">Venta Nº{sale.saleNumber.toString().padStart(7, '0')}</h3>
                           <p className="text-sm text-muted-foreground">
                             {format(sale.saleDate, 'dd/MM/yyyy - HH:mm', { locale: es })}
                          </p>
                        </div>
                         <div className="flex items-center gap-2">
                           <Badge className="bg-primary text-primary-foreground">{getPaymentMethodLabel(sale.paymentMethod)}</Badge>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(sale)}>
                               <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </div>
                      </div>

                      <div className="border-t border-border/50 pt-2">
                          <p className="text-xs text-muted-foreground mb-1">Productos:</p>
                          {sale.items.map(item => (
                              <div key={item.productId} className="flex justify-between items-center text-sm">
                                  <span>{item.productName} <span className="text-muted-foreground">x{item.quantity}</span></span>
                                  <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                              </div>
                          ))}
                      </div>

                      {sale.notes && (
                        <p className="text-sm text-muted-foreground italic pt-2 border-t border-border/50">"{sale.notes}"</p>
                      )}
                    </div>
                     <div className="flex flex-col items-center justify-center bg-muted p-4 rounded-lg w-full sm:w-48 text-center">
                        <p className="text-xs text-muted-foreground">Total Venta</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(sale.totalAmount)}</p>
                         {bcvRate && <p className="text-sm text-muted-foreground">{formatCurrency(sale.totalAmount, 'VES')}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-primary mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchTerm || dateFilter !== 'all'
                    ? 'No se encontraron ventas con los filtros aplicados'
                    : 'No hay ventas registradas. ¡Registra tu primera venta!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <AlertDialog
          open={!!deletingSale}
          onOpenChange={(isOpen) => !isOpen && setDeletingSale(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la venta Nº{deletingSale?.saleNumber.toString().padStart(7,'0')} y restaurará el stock de los productos involucrados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Eliminar y restaurar stock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}
