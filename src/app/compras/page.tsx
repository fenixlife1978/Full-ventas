'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, ShoppingCart, DollarSign, Package, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore } from '@/firebase'
import { collection, doc, Timestamp, runTransaction, deleteDoc } from 'firebase/firestore'
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
import { PurchaseForm, type PurchaseFormValues } from './components/purchase-form'
import Layout from '@/app/layout-app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export interface Purchase {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  totalAmount: number
  purchaseDate: Date
  supplier: string
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito'
  invoiceNumber?: string
  notes?: string
}

export default function ComprasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all');

  const { toast } = useToast()
  const firestore = useFirestore()

  const purchasesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'purchases')
  }, [firestore])

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products')
  }, [firestore]);

  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)

  const formattedPurchases = useMemo(() => {
     return purchases?.map(purchase => ({
      ...purchase,
      purchaseDate: (purchase.purchaseDate as any).toDate ? (purchase.purchaseDate as any).toDate() : purchase.purchaseDate
    })).sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()) || []
  }, [purchases])


  const filteredPurchases = useMemo(() => {
    let filtered = formattedPurchases;

    if (filterPeriod !== 'all') {
      const now = new Date();
      filtered = filtered.filter(purchase => {
        const purchaseDate = purchase.purchaseDate;
        switch (filterPeriod) {
          case 'today':
            return purchaseDate >= startOfDay(now);
          case 'week':
            return purchaseDate >= startOfWeek(now);
          case 'month':
            return purchaseDate >= startOfMonth(now);
          default:
            return true;
        }
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [formattedPurchases, filterPeriod, searchTerm]);

  const { totalPurchases, totalAmount, totalUnits } = useMemo(() => {
    return {
      totalPurchases: filteredPurchases.length,
      totalAmount: filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      totalUnits: filteredPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0)
    }
  }, [filteredPurchases])


  const handleCreateNew = () => {
    setIsFormOpen(true)
  }

  const handleDelete = (purchase: Purchase) => {
    setDeletingPurchase(purchase)
  }
  
  const confirmDelete = async () => {
    if (deletingPurchase && firestore) {
      const purchaseRef = doc(firestore, 'purchases', deletingPurchase.id);
      
      try {
        await runTransaction(firestore, async (transaction) => {
          const productRef = doc(firestore, 'products', deletingPurchase.productId);
          const productDoc = await transaction.get(productRef);
          
          if(productDoc.exists()) {
            const currentStock = productDoc.data().stock;
            const newStock = currentStock - deletingPurchase.quantity;
            transaction.update(productRef, { stock: newStock });
          }
          
          transaction.delete(purchaseRef);
        });

        toast({
          title: 'Compra Eliminada',
          description: `La compra ha sido eliminada y el stock ha sido ajustado.`,
        });

      } catch (error) {
         toast({
          variant: "destructive",
          title: 'Error al eliminar',
          description: `No se pudo eliminar la compra.`,
        });
      }

      setDeletingPurchase(null);
    }
  }


  const handleFormSubmit = async (values: PurchaseFormValues) => {
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

    const purchaseData = {
        ...values,
        productName: selectedProduct.name,
        totalAmount: values.unitCost * values.quantity,
        purchaseDate: Timestamp.fromDate(values.purchaseDate),
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'products', values.productId)
            const purchasesRef = doc(collection(firestore, 'purchases'))
            
            const productDoc = await transaction.get(productRef)
            if(!productDoc.exists()) {
                throw new Error("El producto no existe.")
            }
            
            const currentStock = productDoc.data().stock
            const newStock = currentStock + values.quantity
            
            transaction.update(productRef, { stock: newStock })
            transaction.set(purchasesRef, purchaseData)
        })

        toast({
            title: 'Compra Registrada',
            description: 'La nueva compra se ha registrado exitosamente.',
        })
        setIsFormOpen(false)

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al registrar la compra',
            description: error.message || 'Ocurrió un error inesperado.',
        })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const isLoading = isLoadingPurchases || isLoadingProducts

  return (
    <Layout currentPageName="Control de Compras">
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              <ShoppingCart className="w-8 h-8" />
              Control de Compras
            </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las compras de inventario
          </p>
        </div>
        <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
          <Plus className="mr-2" />
          Nueva Compra
        </Button>
      </header>

      {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Total Compras
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-1/4"/> : <div className="text-3xl font-bold text-foreground">{totalPurchases}</div> }
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Monto Total
              </CardTitle>
            </CardHeader>
            <CardContent>
             {isLoading ? <Skeleton className="h-9 w-1/2"/> : <div className="text-3xl font-bold text-foreground">{formatCurrency(totalAmount)}</div>}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Unidades Compradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-1/3"/> : <div className="text-3xl font-bold text-foreground">{totalUnits}</div>}
            </CardContent>
          </Card>
        </div>


        {/* Filters */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Buscar por producto, proveedor o factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border/50 focus:ring-ring"
                />
              </div>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-full md:w-48 border-border/50 focus:ring-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>


        {/* Purchases List */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              Historial de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
               </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay compras que coincidan con los filtros.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border/50">
                      <th className="text-left p-3 text-foreground font-semibold">Fecha</th>
                      <th className="text-left p-3 text-foreground font-semibold">Producto</th>
                      <th className="text-left p-3 text-foreground font-semibold">Proveedor</th>
                      <th className="text-right p-3 text-foreground font-semibold">Cantidad</th>
                      <th className="text-right p-3 text-foreground font-semibold">Costo Unit.</th>
                      <th className="text-right p-3 text-foreground font-semibold">Total</th>
                      <th className="text-left p-3 text-foreground font-semibold">Pago</th>
                      <th className="text-left p-3 text-foreground font-semibold">Factura</th>
                      <th className="text-right p-3 text-foreground font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="border-b border-border/20 hover:bg-muted transition-colors">
                        <td className="p-3 text-muted-foreground">
                          {format(purchase.purchaseDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                        </td>
                        <td className="p-3 text-primary font-medium">{purchase.productName}</td>
                        <td className="p-3 text-muted-foreground">{purchase.supplier}</td>
                        <td className="p-3 text-right text-muted-foreground">{purchase.quantity}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {formatCurrency(purchase.unitCost)}
                        </td>
                        <td className="p-3 text-right text-primary font-bold">
                          {formatCurrency(purchase.totalAmount)}
                        </td>
                        <td className="p-3 text-muted-foreground">{purchase.paymentMethod}</td>
                        <td className="p-3 text-muted-foreground">{purchase.invoiceNumber || '-'}</td>
                        <td className='p-3 text-right'>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(purchase)}>Eliminar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>


      <PurchaseForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        products={products || []}
        isLoadingProducts={isLoadingProducts}
      />

      <AlertDialog
        open={!!deletingPurchase}
        onOpenChange={(isOpen) => !isOpen && setDeletingPurchase(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>

            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la compra del producto "{deletingPurchase?.productName}" y se restará la cantidad del stock actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar y ajustar stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </Layout>
  )
}
