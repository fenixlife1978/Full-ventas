'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, ShoppingCart, DollarSign, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore } from '@/firebase'
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
import { SaleForm, type SaleFormValues } from './components/sale-form'
import Layout from '@/app/layout-app'
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
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
import { startOfWeek, startOfMonth, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { format } from 'date-fns'


export interface Sale {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  saleDate: Date
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other'
  notes?: string
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

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)

  const activeProducts = useMemo(() => {
    return products?.filter(p => p.status === 'active') || []
  }, [products])

  const formattedSales = useMemo(() => {
    return sales?.map(sale => ({
      ...sale,
      saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : new Date(sale.saleDate)
    })).sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime()) || []
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
      filtered = filtered.filter(
        s =>
          s.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [formattedSales, searchTerm, dateFilter])


  const summaryStats = useMemo(() => {
    const totalSales = filteredSales.length
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    return { totalSales, totalRevenue }
  }, [filteredSales])


  const handleCreateNew = () => {
    setIsFormOpen(true)
  }

  const handleDelete = (sale: Sale) => {
    setDeletingSale(sale)
  }

  const confirmDelete = () => {
    if (deletingSale && firestore) {
      const saleRef = doc(firestore, 'sales', deletingSale.id)
      deleteDocumentNonBlocking(saleRef)
      toast({
        title: 'Venta Eliminada',
        description: `La venta ha sido eliminada.`,
      })
      setDeletingSale(null)
    }
  }


  const handleFormSubmit = async (values: SaleFormValues) => {
    if (!firestore) return

    const selectedProduct = products?.find(p => p.id === values.productId)
    if (!selectedProduct) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El producto seleccionado no es válido.',
      })
      return
    }

    if (selectedProduct.stock < values.quantity) {
      toast({
        variant: 'destructive',
        title: 'Stock Insuficiente',
        description: `No hay suficiente stock para ${selectedProduct.name}. Stock actual: ${selectedProduct.stock}`,
      })
      return
    }

    const saleData = {
      ...values,
      productName: selectedProduct.name,
      unitPrice: selectedProduct.price,
      totalAmount: selectedProduct.price * values.quantity,
      saleDate: Timestamp.fromDate(values.saleDate),
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const productRef = doc(firestore, 'products', values.productId)
        const salesRef = doc(collection(firestore, 'sales'))

        const productDoc = await transaction.get(productRef)
        if (!productDoc.exists()) {
          throw new Error("El producto no existe.")
        }

        const currentStock = productDoc.data().stock
        const newStock = currentStock - values.quantity

        if (newStock < 0) {
          throw new Error("Stock insuficiente.")
        }

        transaction.update(productRef, { stock: newStock })
        transaction.set(salesRef, saleData)
      })

      toast({
        title: 'Venta Registrada',
        description: 'La nueva venta se ha registrado exitosamente.',
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

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      other: 'Otro',
    };
    return labels[method] || method;
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
     style: 'currency',
     currency: 'EUR',
   }).format(value)
 }

 const isLoading = isLoadingSales || isLoadingProducts;

  return (
    <Layout currentPageName="Gestión de Ventas">
      <div className="space-y-6 p-4 md:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#00704a]">Ventas</h1>
            <p className="text-[#6b5d4f] mt-2">Registra y gestiona las ventas diarias</p>
          </div>
          <Button onClick={handleCreateNew} className="w-full sm:w-auto bg-[#00704a] hover:bg-[#005a3c] text-white shadow-lg">
            <Plus className="mr-2" />
            Nueva Venta
          </Button>
        </header>

         {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-[#00704a] shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#6b5d4f]">
                Total Ventas ({dateFilter === 'today' ? 'Hoy' : dateFilter === 'week' ? 'Esta Semana' : dateFilter === 'month' ? 'Este Mes' : 'Todas'})
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-[#00704a]" />
            </CardHeader>
            <CardContent>
             { isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold text-[#00704a]">{summaryStats.totalSales}</div> }
            </CardContent>
          </Card>
          <Card className="bg-white border-[#00704a] shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#6b5d4f]">Ingresos Totales</CardTitle>
              <DollarSign className="h-5 w-5 text-[#00704a]" />
            </CardHeader>
            <CardContent>
              { isLoading ? <Skeleton className="h-8 w-1/3" /> : <div className="text-2xl font-bold text-[#00704a]">{formatCurrency(summaryStats.totalRevenue)}</div> }
            </CardContent>
          </Card>
        </div>


        {/* Filters */}
        <Card className="bg-white border-[#00704a] shadow-lg">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6b5d4f]" />
                <Input
                  placeholder="Buscar por producto o notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#00704a] focus:ring-[#00704a]"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="border-[#00704a] focus:ring-[#00704a]">
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
                <Card key={i} className="bg-white border-[#00704a]">
                    <CardContent className="p-6">
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            ))
          ) : filteredSales.length > 0 ? (
            filteredSales.map(sale => (
              <Card key={sale.id} className="bg-white border-[#00704a] hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[#00704a]">{sale.productName}</h3>
                          <p className="text-sm text-[#6b5d4f] flex items-center">
                            <span className="lucide lucide-calendar-days h-3 w-3 mr-1.5" />
                             {format(sale.saleDate, 'dd/MM/yyyy - HH:mm', { locale: es })}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                           <Badge className="bg-[#00704a]">{getPaymentMethodLabel(sale.paymentMethod)}</Badge>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(sale)}>
                               <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </div>
                      </div>
                      {sale.notes && (
                        <p className="text-sm text-[#6b5d4f] italic">"{sale.notes}"</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-[#6b5d4f]">Cantidad</p>
                          <p className="text-sm font-medium text-[#00704a]">{sale.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#6b5d4f]">Precio Unitario</p>
                          <p className="text-sm font-medium text-[#00704a]">
                            {formatCurrency(sale.unitPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#6b5d4f]">Total</p>
                          <p className="text-sm font-bold text-[#00704a]">
                            {formatCurrency(sale.totalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white border-[#00704a]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-[#00704a] mb-4" />
                <p className="text-[#6b5d4f] text-center">
                  {searchTerm || dateFilter !== 'all'
                    ? 'No se encontraron ventas con los filtros aplicados'
                    : 'No hay ventas registradas. ¡Registra tu primera venta!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>


        <SaleForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleFormSubmit}
          products={activeProducts}
          isLoadingProducts={isLoadingProducts}
        />

        <AlertDialog
          open={!!deletingSale}
          onOpenChange={(isOpen) => !isOpen && setDeletingSale(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la venta del producto "{deletingSale?.productName}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}
