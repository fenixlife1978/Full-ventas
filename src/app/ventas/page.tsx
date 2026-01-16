'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, ShoppingCart, DollarSign, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc, Timestamp, runTransaction } from 'firebase/firestore'
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
import { SaleForm, type SaleFormValues, type CartItem } from './components/sale-form'

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
}

export default function VentasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
  const { toast } = useToast()
  const firestore = useFirestore()

  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  
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

  const activeProducts = useMemo(() => {
    return products?.filter(p => p.status === 'active') || []
  }, [products])

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

  const handleFormSubmit = async (values: SaleFormValues & { items: CartItem[], totalAmount: number, saleNumber: number }) => {
    if (!firestore) return
    const saleData = {
      saleNumber: values.saleNumber,
      items: values.items.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      totalAmount: values.totalAmount,
      paymentMethod: values.paymentMethod,
      saleDate: Timestamp.fromDate(values.saleDate),
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const salesRef = doc(collection(firestore, 'sales'))
        for (const item of values.items) {
           const productRef = doc(firestore, 'products', item.id)
           const productDoc = await transaction.get(productRef)
           if (!productDoc.exists()) throw new Error(`El producto "${item.name}" no existe.`)
           const currentStock = productDoc.data().stock
           const newStock = currentStock - item.quantity
           if (newStock < 0) throw new Error(`Stock insuficiente para "${item.name}".`)
           transaction.update(productRef, { stock: newStock })
        }
        transaction.set(salesRef, saleData)
      })
      toast({ title: 'Venta Registrada', description: `La venta se ha registrado exitosamente.` })
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al registrar la venta', description: error.message || 'Ocurrió un error inesperado.' })
    }
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
              transaction.update(productRef, { stock: currentStock + item.quantity });
            }
          }
          transaction.delete(saleRef);
        })
        toast({ title: 'Venta Eliminada', description: 'La venta ha sido eliminada y el stock restaurado.' })
        setDeletingSale(null)
      } catch (error) {
         toast({ variant: "destructive", title: 'Error al eliminar', description: 'No se pudo eliminar la venta.' });
      }
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
    // @ts-ignore
    return labels[method] || method;
  };
  
  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES' && bcvRate) {
      value = value * bcvRate
      return `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(value)}`
    }
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)
  }

  const isLoading = isLoadingSales || isLoadingSettings || isLoadingProducts;

  return (
    <Layout currentPageName="Gestión de Ventas">
      <div className="min-h-screen bg-background space-y-6 p-4 md:p-10 transition-colors duration-300">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tighter italic">
              Gestión de Ventas
            </h1>
            <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
              Consulta y gestiona el historial de ventas
            </p>
          </div>
          <Button 
            onClick={() => setIsFormOpen(true)} 
            className="w-full sm:w-auto bg-primary text-white px-8 py-6 rounded-xl font-black uppercase tracking-tighter italic shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nueva Venta
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/5">
              <CardTitle className="text-xs font-black text-primary uppercase tracking-wider">
                Total Ventas ({dateFilter === 'today' ? 'Hoy' : 'Periodo'})
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              { isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-4xl font-black text-foreground tracking-tighter">{summaryStats.totalSales}</div> }
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/5">
              <CardTitle className="text-xs font-black text-primary uppercase tracking-wider">Ingresos Totales</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              { isLoading ? <Skeleton className="h-8 w-1/3" /> : (
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(summaryStats.totalRevenue, 'VES')}</span>
                  {bcvRate && <span className="text-sm font-bold text-muted-foreground uppercase italic">{formatCurrency(summaryStats.totalRevenue, 'USD')}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative group">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Input
              placeholder="Buscar por Nº Venta, producto o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-6 bg-card border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all font-medium text-sm h-auto"
            />
          </div>
          <div className="relative group">
            <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full pl-12 py-6 bg-card border-border rounded-xl focus:border-primary transition-all font-bold text-sm h-auto">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
          ) : filteredSales.length > 0 ? (
            filteredSales.map(sale => (
              <Card key={sale.id} className="bg-card border-border rounded-2xl hover:shadow-md transition-all group overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter">
                            Venta Nº{sale.saleNumber.toString().padStart(7, '0')}
                          </h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {format(sale.saleDate, "EEEE, dd 'de' MMMM", { locale: es })} • {format(sale.saleDate, "HH:mm")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary text-primary font-black uppercase text-[10px] italic">
                            {getPaymentMethodLabel(sale.paymentMethod)}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors" 
                            onClick={() => setDeletingSale(sale)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {sale.items.map(item => (
                          <div key={item.productId} className="flex justify-between items-center text-sm font-medium">
                            <span className="text-foreground uppercase text-xs font-bold">
                              {item.productName} <span className="text-muted-foreground font-normal italic">x{item.quantity}</span>
                            </span>
                            <span className="text-primary font-black">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                    </div>

                    <div className="bg-primary/5 sm:w-48 p-6 flex flex-col items-center justify-center border-l border-border/50 text-center">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Cobrado</p>
                      <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(sale.totalAmount, 'VES')}</p>
                      {bcvRate && <p className="text-xs font-bold text-muted-foreground italic">{formatCurrency(sale.totalAmount, 'USD')}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="bg-card border border-border border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-10 text-primary" />
              <p className="font-black uppercase tracking-widest text-xs">No se encontraron registros</p>
            </div>
          )}
        </div>

        <SaleForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleFormSubmit}
          products={activeProducts}
          isLoadingProducts={isLoadingProducts}
          bcvRate={bcvRate}
          saleCount={sales?.length || 0}
        />

        <AlertDialog open={!!deletingSale} onOpenChange={(isOpen) => !isOpen && setDeletingSale(null)}>
          <AlertDialogContent className="rounded-2xl border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase italic text-primary">¿Anular esta venta?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs font-medium">
                Se restaurará el stock de los productos. Esta acción es permanente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase">Volver</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white rounded-xl font-black text-xs uppercase tracking-tighter">
                Confirmar Anulación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}
