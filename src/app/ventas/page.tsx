'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { SaleList } from './components/sale-list'
import Layout from '@/app/layout-app'
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'

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

  const salesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'sales')
  }, [firestore])

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products')
  }, [firestore]);

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)

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

    if(selectedProduct.stock < values.quantity) {
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
            if(!productDoc.exists()) {
                throw new Error("El producto no existe.")
            }
            
            const currentStock = productDoc.data().stock
            const newStock = currentStock - values.quantity

            if(newStock < 0) {
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
  
  const formattedSales = sales?.map(sale => ({
    ...sale,
    saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : sale.saleDate
  }))


  return (
    <Layout currentPageName="Gestión de Ventas">
      <div className="space-y-8 p-4 md:p-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Gestión de Ventas
            </h1>
            <p className="text-muted-foreground">
              Registra y administra las ventas de tus productos.
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2" />
            Registrar Venta
          </Button>
        </header>

        <SaleList
          sales={formattedSales || []}
          isLoading={isLoadingSales}
          onDelete={handleDelete}
        />

        <SaleForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleFormSubmit}
          products={products || []}
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
