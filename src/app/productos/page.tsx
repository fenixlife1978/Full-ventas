'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ProductForm, ProductFormValues } from './components/product-form'
import { ProductList } from './components/product-list'
import { useCollection, useFirestore } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
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

export interface Product {
  id: string
  name: string
  description?: string
  sku: string
  category?: string
  price: number
  cost?: number
  stock: number
  minStock?: number
  unit?: string
  supplier?: string
  status: 'active' | 'inactive'
}

export default function ProductosPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const { toast } = useToast()
  const firestore = useFirestore()

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products')
  }, [firestore])

  const { data: products, isLoading } = useCollection<Product>(productsCollection)

  const handleCreateNew = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setDeletingProduct(product)
  }
  
  const confirmDelete = () => {
    if (deletingProduct && firestore) {
      const productRef = doc(firestore, 'products', deletingProduct.id)
      deleteDocumentNonBlocking(productRef)
      toast({
        title: 'Producto Eliminado',
        description: `El producto "${deletingProduct.name}" ha sido eliminado.`,
      })
      setDeletingProduct(null)
    }
  }


  const handleFormSubmit = (values: ProductFormValues) => {
    if (!firestore) return
    
    if (editingProduct) {
      // Update
      const productRef = doc(firestore, 'products', editingProduct.id)
      updateDocumentNonBlocking(productRef, values)
      toast({
        title: 'Producto Actualizado',
        description: 'El producto se ha actualizado exitosamente.',
      })
    } else {
      // Create
      const productsRef = collection(firestore, 'products')
      addDocumentNonBlocking(productsRef, values)
      toast({
        title: 'Producto Creado',
        description: 'El nuevo producto se ha creado exitosamente.',
      })
    }
    setIsFormOpen(false)
    setEditingProduct(null)
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gestión de Productos
          </h1>
          <p className="text-muted-foreground">
            Añade, edita y gestiona tu inventario de productos.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2" />
          Añadir Producto
        </Button>
      </header>

      <ProductList
        products={products || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        product={editingProduct}
      />

      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(isOpen) => !isOpen && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              el producto "{deletingProduct?.name}".
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
