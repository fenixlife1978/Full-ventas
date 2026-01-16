'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, ShoppingCart, DollarSign, Trash2, FileText, RefreshCw } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useMemoFirebase } from '@/firebase/provider'
import { type Product } from '../productos/page'
import { SaleForm, type SaleFormValues, type CartItem } from './components/sale-form'
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false)
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
  const { toast } = useToast()
  const firestore = useFirestore()

  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedPriceCheckerProduct, setSelectedPriceCheckerProduct] = useState<Product | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)


  const salesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'sales')
  }, [firestore])

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'products')
  }, [firestore, refreshKey])

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


  const handleCreateNew = () => {
    setIsFormOpen(true)
  }

  const handleDelete = (sale: Sale) => {
    setDeletingSale(sale)
  }
  
  const handleRefresh = () => {
    setRefreshKey(t => t + 1);
    toast({
        title: 'Vista actualizada',
        description: 'Los datos han sido sincronizados.',
    });
  };


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
      notes: values.notes,
      saleDate: Timestamp.fromDate(values.saleDate),
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const salesRef = doc(collection(firestore, 'sales'))

        for (const item of values.items) {
           const productRef = doc(firestore, 'products', item.id)
           const productDoc = await transaction.get(productRef)
           if (!productDoc.exists()) {
             throw new Error(`El producto "${item.name}" no existe.`)
           }
           const currentStock = productDoc.data().stock
           const newStock = currentStock - item.quantity
           if (newStock < 0) {
             throw new Error(`Stock insuficiente para "${item.name}".`)
           }
           transaction.update(productRef, { stock: newStock })
        }
        
        transaction.set(salesRef, saleData)
      })

      toast({
        title: 'Venta Registrada',
        description: `La venta Nº${values.saleNumber} se ha registrado exitosamente.`,
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

 const isLoading = isLoadingSales || isLoadingProducts || isLoadingSettings;

  return (
    <Layout currentPageName="Gestión de Ventas">
      <div className="space-y-6 p-4 md:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Ventas</h1>
            <p className="text-muted-foreground mt-2">Registra y gestiona las ventas diarias</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto border-border text-foreground hover:bg-accent hover:text-accent-foreground shadow-lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
            </Button>
            <Button onClick={() => setIsPriceCheckerOpen(true)} variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground shadow-lg">
              <DollarSign className="mr-2" />
              Consultar Precio
            </Button>
            <Button onClick={handleCreateNew} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              <Plus className="mr-2" />
              Nueva Venta
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
                          <h3 className="text-xl font-bold text-foreground">Venta Nº{sale.saleNumber.toString().padStart(3, '0')}</h3>
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


        <SaleForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleFormSubmit}
          products={activeProducts}
          isLoadingProducts={isLoadingProducts}
          bcvRate={bcvRate}
          saleCount={sales?.length || 0}
        />

        <AlertDialog
          open={!!deletingSale}
          onOpenChange={(isOpen) => !isOpen && setDeletingSale(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la venta Nº{deletingSale?.saleNumber.toString().padStart(3,'0')} y restaurará el stock de los productos involucrados.
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

        <Dialog open={isPriceCheckerOpen} onOpenChange={setIsPriceCheckerOpen}>
            <DialogContent className="max-w-md bg-background border-border/50">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-foreground">Consultor de Precios</DialogTitle>
                    <DialogDescription>
                        Selecciona un producto para ver su precio en Bs. y USD.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    
                     <div className="grid grid-cols-1 items-center gap-4">
                        <label className="text-foreground font-semibold">Producto</label>
                        <Select 
                          onValueChange={(productId) => {
                            const product = products?.find(p => p.id === productId)
                            setSelectedPriceCheckerProduct(product || null)
                          }}
                          disabled={isLoadingProducts}
                        >
                            <SelectTrigger className="w-full border-border/50 focus:ring-ring">
                                <SelectValue placeholder={isLoadingProducts ? "Cargando..." : "Selecciona un producto"} />
                            </SelectTrigger>
                            <SelectContent>
                                {activeProducts.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedPriceCheckerProduct && bcvRate && (
                        <Card className="col-span-3 mt-4 border-primary bg-primary/5">
                            <CardContent className="pt-6 text-center">
                                <p className="text-sm text-muted-foreground">{selectedPriceCheckerProduct.name}</p>
                                <p className="text-6xl font-bold text-primary my-2">
                                    {formatCurrency(selectedPriceCheckerProduct.price, 'VES')}
                                </p>
                                <p className="text-lg font-semibold text-muted-foreground">
                                    {formatCurrency(selectedPriceCheckerProduct.price, 'USD')}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {!bcvRate && (
                      <div className="text-center text-muted-foreground p-4 bg-muted rounded-md">
                        <p>Por favor, establece la tasa BCV en la página de <Link href="/configuraciones" className="text-primary underline">Configuraciones</Link> para ver los precios en Bolívares.</p>
                      </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}

    