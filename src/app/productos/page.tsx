'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ProductForm, ProductFormValues } from './components/product-form'
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
import Layout from '@/app/layout-app'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'


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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { toast } = useToast()
  const firestore = useFirestore()

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products')
  }, [firestore])

  const { data: products, isLoading } = useCollection<Product>(productsCollection)

  const categories = useMemo(() => {
    if (!products) return []
    return [...new Set(products.map(p => p.category).filter(Boolean))]
  }, [products])
  
  const filteredProducts = useMemo(() => {
    if (!products) return []
    
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    return filtered;

  }, [products, searchTerm, categoryFilter, statusFilter])


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
      const productRef = doc(firestore, 'products', editingProduct.id)
      updateDocumentNonBlocking(productRef, values)
      toast({
        title: 'Producto Actualizado',
        description: 'El producto se ha actualizado exitosamente.',
      })
    } else {
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
    <Layout currentPageName="Gestión de Productos">
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground mt-2">Gestiona el inventario de tu bodega</p>
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
          <Plus className="mr-2" />
          Agregar Producto
        </Button>
      </header>

      <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border/50 focus:ring-ring"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="border-border/50 focus:ring-ring">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-border/50 focus:ring-ring">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
             Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="bg-card border-border/50">
                    <CardContent className="p-6">
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
             ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <Card key={product.id} className="bg-card border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        </div>
                        <div className="flex gap-2">
                          {product.stock <= (product.minStock || 0) && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stock Bajo
                            </Badge>
                          )}
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className={product.status === 'active' ? 'bg-primary text-primary-foreground' : ''}>
                            {product.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Categoría</p>
                          <p className="text-sm font-medium text-foreground">{product.category || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Precio</p>
                          <p className="text-sm font-medium text-foreground">
                             {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(product.price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Stock</p>
                          <p className="text-sm font-medium text-foreground">
                            {product.stock} {product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Stock Mínimo</p>
                          <p className="text-sm font-medium text-foreground">{product.minStock || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex lg:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1 lg:flex-none border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Edit className="mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        className="flex-1 lg:flex-none"
                      >
                        <Trash2 className="mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-primary mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'No se encontraron productos con los filtros aplicados'
                    : 'No hay productos registrados. ¡Agrega tu primer producto!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>


      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        product={editingProduct}
        categories={categories}
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
    </Layout>
  )
}
