'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore } from '@/firebase'
import { collection, doc, Timestamp, runTransaction } from 'firebase/firestore'
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
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
import { PurchaseList } from './components/purchase-list'

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

  const handleCreateNew = () => {
    setIsFormOpen(true)
  }

  const handleDelete = (purchase: Purchase) => {
    setDeletingPurchase(purchase)
  }
  
  const confirmDelete = () => {
    if (deletingPurchase && firestore) {
      const purchaseRef = doc(firestore, 'purchases', deletingPurchase.id)
      deleteDocumentNonBlocking(purchaseRef)
      toast({
        title: 'Compra Eliminada',
        description: `La compra ha sido eliminada.`,
      })
      setDeletingPurchase(null)
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
  
  const formattedPurchases = purchases?.map(purchase => ({
    ...purchase,
    purchaseDate: (purchase.purchaseDate as any).toDate ? (purchase.purchaseDate as any).toDate() : purchase.purchaseDate
  }))


  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gestión de Compras
          </h1>
          <p className="text-muted-foreground">
            Registra y administra las compras de tus productos.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2" />
          Registrar Compra
        </Button>
      </header>

      <PurchaseList
        purchases={formattedPurchases || []}
        isLoading={isLoadingPurchases}
        onDelete={handleDelete}
      />

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
              Esta acción no se puede deshacer. Esto eliminará permanentemente la compra del producto "{deletingPurchase?.productName}".
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
  )
}
