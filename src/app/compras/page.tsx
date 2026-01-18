'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, ShoppingCart, DollarSign, Package, TrendingUp, Percent, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc, Timestamp, runTransaction, updateDoc } from 'firebase/firestore'
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
import {
  Dialog,
  DialogClose,
  DialogContent as DialogContentNonForm,
  DialogDescription,
  DialogFooter as DialogFooterNonForm,
  DialogHeader as DialogHeaderNonForm,
  DialogTitle as DialogTitleNonForm,
} from "@/components/ui/dialog"
import { type Setting } from '../configuraciones/page'


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

interface PricingModalInfo {
  purchase: Purchase
  product: Product
}

export default function ComprasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [pricingModalInfo, setPricingModalInfo] = useState<PricingModalInfo | null>(null)
  const [profitMargin, setProfitMargin] = useState<string>('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])
  
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

  const settingsDoc = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)

  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])

  const formattedPurchases = useMemo(() => {
     return purchases?.map(purchase => ({
      ...purchase,
      purchaseDate: (purchase.purchaseDate as any).toDate ? (purchase.purchaseDate as any).toDate() : purchase.purchaseDate
    })).sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()) || []
  }, [purchases])


  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStartDate = startOfMonth(now);
    const monthlyPurchases = formattedPurchases.filter(p => p.purchaseDate >= monthStartDate);
    
    const amountCents = monthlyPurchases.reduce((sum, p) => sum + Math.round((p.totalAmount || 0) * 100), 0);
    
    return {
        totalPurchases: monthlyPurchases.length,
        totalAmount: amountCents / 100,
        totalUnits: monthlyPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0)
    };
  }, [formattedPurchases]);


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

  const handleCreateNew = () => {
    setIsFormOpen(true)
  }

  const handleDelete = (purchase: Purchase) => {
    setDeletingPurchase(purchase)
  }
  
  const handleOpenPricingModal = (purchase: Purchase) => {
    const product = products?.find(p => p.id === purchase.productId)
    if (product) {
      setPricingModalInfo({ purchase, product })
      if (product.profitMargin) {
        setProfitMargin(String(product.profitMargin))
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo encontrar el producto asociado a esta compra.',
      })
    }
  }

  const handleSetPrice = async () => {
    if (!pricingModalInfo || !firestore) return
    const { product } = pricingModalInfo
    const margin = parseFloat(profitMargin)
    if (isNaN(margin) || margin < 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Porcentaje de ganancia inválido.',
      })
      return
    }

    const cost = pricingModalInfo.purchase.unitCost
    const newPriceInCents = Math.round(cost * (1 + margin / 100) * 100);
    const newPrice = newPriceInCents / 100;

    try {
      const productRef = doc(firestore, 'products', product.id)
      await updateDoc(productRef, { price: newPrice, profitMargin: margin })
      toast({
        title: 'Precio Actualizado',
        description: `El precio de "${product.name}" se actualizó a ${formatCurrency(newPrice, 'USD')}.`,
      })
      setPricingModalInfo(null)
      setProfitMargin('')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: 'No se pudo actualizar el precio del producto.',
      })
    }
  }

  const newSalePrice = useMemo(() => {
    if (!pricingModalInfo || !profitMargin) return null
    const margin = parseFloat(profitMargin)
    if (isNaN(margin)) return null
    const cost = pricingModalInfo.purchase.unitCost
    const newPriceInCents = Math.round(cost * (1 + margin / 100) * 100);
    return newPriceInCents / 100;
  }, [pricingModalInfo, profitMargin])

  
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
        totalAmount: Math.round(values.unitCost * values.quantity * 100) / 100,
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
            
            transaction.update(productRef, { stock: newStock, cost: values.unitCost })
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

  const isLoading = isLoadingPurchases || isLoadingProducts || isLoadingSettings

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
        <Button onClick={handleCreateNew} className="px-6 py-3 rounded-xl font-bold uppercase tracking-tighter italic shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200">
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
                Total Compras (Mes Actual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || !isClient ? <Skeleton className="h-9 w-1/4"/> : <div className="text-3xl font-bold text-foreground">{monthlyStats.totalPurchases}</div> }
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Monto Total (Mes Actual)
              </CardTitle>
            </CardHeader>
            <CardContent>
             {isLoading || !isClient ? <Skeleton className="h-9 w-1/2"/> : (
              <>
                <div className="text-3xl font-bold text-foreground">{formatCurrency(monthlyStats.totalAmount, 'USD')}</div>
                {bcvRate && <div className="text-sm text-muted-foreground">{formatCurrency(monthlyStats.totalAmount, 'VES')}</div>}
              </>
             )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Unidades Compradas (Mes Actual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || !isClient ? <Skeleton className="h-9 w-1/3"/> : <div className="text-3xl font-bold text-foreground">{monthlyStats.totalUnits}</div>}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full">
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
            {isLoading || !isClient ? (
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
                      <th className="text-left p-3 text-foreground font-semibold">Factura</th>
                      <th className="text-center p-3 text-foreground font-semibold">Acciones</th>
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
                            <div>{formatCurrency(purchase.unitCost, 'USD')}</div>
                            {bcvRate && <div className="text-xs">{formatCurrency(purchase.unitCost, 'VES')}</div>}
                        </td>
                        <td className="p-3 text-right text-primary font-bold">
                            <div>{formatCurrency(purchase.totalAmount, 'USD')}</div>
                            {bcvRate && <div className="text-xs">{formatCurrency(purchase.totalAmount, 'VES')}</div>}
                        </td>
                        <td className="p-3 text-muted-foreground">{purchase.invoiceNumber || '-'}</td>
                        <td className='p-3 text-center space-x-2'>
                            <Button variant="outline" size="sm" onClick={() => handleOpenPricingModal(purchase)}>
                                <Percent className="w-4 h-4 mr-1"/> Fijar Precio
                            </Button>
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
      
      {pricingModalInfo && (
        <Dialog open={!!pricingModalInfo} onOpenChange={(open) => !open && setPricingModalInfo(null)}>
          <DialogContentNonForm>
            <DialogHeaderNonForm>
              <DialogTitleNonForm className="text-2xl">Fijar Precio de Venta</DialogTitleNonForm>
              <DialogDescription>
                Establece el porcentaje de ganancia sobre el costo de compra para el producto <strong>{pricingModalInfo.product.name}</strong>.
              </DialogDescription>
            </DialogHeaderNonForm>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 items-center">
                  <p className="text-sm font-medium">Costo de Compra:</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold justify-self-end">{formatCurrency(pricingModalInfo.purchase.unitCost, 'USD')}</p>
                    {bcvRate && <p className="text-xs text-muted-foreground">{formatCurrency(pricingModalInfo.purchase.unitCost, 'VES')}</p>}
                  </div>
                  
                  <p className="text-sm font-medium">Precio de Venta Actual:</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold justify-self-end">{formatCurrency(pricingModalInfo.product.price, 'USD')}</p>
                    {bcvRate && <p className="text-xs text-muted-foreground">{formatCurrency(pricingModalInfo.product.price, 'VES')}</p>}
                  </div>
              </div>

              <div className="flex items-center gap-4">
                <label htmlFor="profit-margin" className="text-sm font-medium whitespace-nowrap">Ganancia (%):</label>
                <Input
                  id="profit-margin"
                  type="number"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                  placeholder="Ej: 30"
                  className="border-border/50 focus:ring-ring"
                />
              </div>

              {newSalePrice !== null && (
                 <Card className="bg-primary/10 border-primary/20">
                    <CardContent className="pt-4">
                       <div className="flex justify-between items-center">
                          <span className="text-primary font-medium">Nuevo Precio de Venta:</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(newSalePrice, 'USD')}
                            </span>
                            {bcvRate && <p className="text-sm text-muted-foreground">{formatCurrency(newSalePrice, 'VES')}</p>}
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              )}

            </div>
            <DialogFooterNonForm>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSetPrice} disabled={!profitMargin}>
                Actualizar Precio
              </Button>
            </DialogFooterNonForm>
          </DialogContentNonForm>
        </Dialog>
      )}


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
