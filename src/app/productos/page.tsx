'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ProductForm, ProductFormValues } from './components/product-form'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { type Setting } from '../configuraciones/page'


export interface Product {
  id: string
  name: string
  description?: string
  category?: string
  price: number
  cost?: number
  profitMargin?: number
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
  
  const settingsDoc = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc);
  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings]);

  const isLoading = isLoadingProducts || isLoadingSettings;

  const categories = useMemo(() => {
    if (!products) return []
    const productCategories = [
      "Alimentos Procesados",
      "Refrescos y Bebidas",
      "Alimentos enlatados",
      "Productos Lacteos",
      "Charcuteria",
      "Carniceria",
      "Frutas y Legumbres",
      "Otros",
    ];
    return productCategories;
  }, [products])
  
  const filteredProducts = useMemo(() => {
    if (!products) return []
    
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  
  const confirmDelete = async () => {
    if (deletingProduct && firestore) {
      const productRef = doc(firestore, 'products', deletingProduct.id)
      await deleteDoc(productRef)
      toast({
        title: 'Producto Eliminado',
        description: `El producto "${deletingProduct.name}" ha sido eliminado.`,
      })
      setDeletingProduct(null)
    }
  }

  const handleFormSubmit = async (values: ProductFormValues) => {
    if (!firestore) return
    
    if (editingProduct) {
      const productRef = doc(firestore, 'products', editingProduct.id)
      await updateDoc(productRef, values)
      toast({
        title: 'Producto Actualizado',
        description: 'El producto se ha actualizado exitosamente.',
      })
    } else {
      await addDoc(collection(firestore, 'products'), values)
      toast({
        title: 'Producto Creado',
        description: 'El nuevo producto se ha creado exitosamente.',
      })
    }
    setIsFormOpen(false)
    setEditingProduct(null)
  }
  
  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES' && bcvRate) {
      value = value * bcvRate
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value || 0)}`
    }
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value || 0)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('Listado de Productos', 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28)

    const tableData = filteredProducts.map(p => [
      p.name,
      p.category || 'N/A',
      bcvRate ? formatCurrency(p.price, 'VES') : formatCurrency(p.price, 'USD'),
      p.cost ? (bcvRate ? formatCurrency(p.cost, 'VES') : formatCurrency(p.cost, 'USD')) : 'N/A',
      `${p.stock} ${p.unit}`,
      p.status === 'active' ? 'Activo' : 'Inactivo',
    ])

    autoTable(doc, {
      startY: 35,
      head: [['Nombre', 'Categoría', 'Precio', 'Costo', 'Stock', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [31, 122, 85] },
    })

    doc.save(`listado-productos-${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  return (
    <Layout currentPageName="Gestión de Productos">
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground mt-2">Gestiona el inventario de tu bodega</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportToPDF} variant="outline" className="w-full sm:w-auto border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                <Download className="mr-2" />
                Exportar PDF
            </Button>
            <Button onClick={handleCreateNew} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              <Plus className="mr-2" />
              Agregar Producto
            </Button>
        </div>
      </header>

      <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
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
                          <div>
                            <p className="text-sm font-medium text-foreground">{bcvRate ? formatCurrency(product.price, 'VES') : formatCurrency(product.price, 'USD')}</p>
                            {bcvRate && <p className="text-xs text-muted-foreground/80">{formatCurrency(product.price, 'USD')}</p>}
                          </div>
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
