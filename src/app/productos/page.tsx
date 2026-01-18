'use client'

import { useState, useMemo, useEffect } from 'react'
// Se agregaron los iconos faltantes que causaban errores de tipos
import { Plus, Search, Edit, Trash2, Package, Download, ChevronLeft, ChevronRight } from 'lucide-react'
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
// Importaciones de PDF y fechas
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
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

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
  }, [])
  
  const filteredProducts = useMemo(() => {
    if (!products) return []
    
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

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
      await updateDoc(productRef, values as any)
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
      const convertedValue = value * bcvRate
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(convertedValue || 0)}`
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
      formatCurrency(p.price, 'USD'),
      p.cost ? formatCurrency(p.cost, 'USD') : 'N/A',
      `${p.stock} ${p.unit}`,
      p.status === 'active' ? 'Activo' : 'Inactivo',
    ])

    autoTable(doc, {
      startY: 35,
      head: [['Nombre', 'Categoría', 'Precio (USD)', 'Costo (USD)', 'Stock', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [26, 48, 37] }, // Dark green from theme
    })

    doc.save(`listado-productos-${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  return (
    <Layout currentPageName="Gestión de Productos">
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground uppercase">Productos</h1>
          <p className="text-muted-foreground mt-2">Gestiona el inventario de tu bodega</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportToPDF} variant="secondary" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-tighter transition-all duration-200">
                <Download className="h-5 w-5 mr-1" />
                Exportar PDF
            </Button>
            <Button onClick={handleCreateNew} className="flex items-center justify-center gap-2 text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase tracking-tighter italic shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200">
              <Plus className="h-5 w-5 mr-1" />
              Agregar Producto
            </Button>
        </div>
      </header>

      <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
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

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-card/50 border-b border-border">
                <tr>
                  <th className="p-4 text-xs font-black uppercase text-primary tracking-wider">Producto</th>
                  <th className="p-4 text-xs font-black uppercase text-primary tracking-wider">Stock</th>
                  <th className="p-4 text-xs font-black uppercase text-primary tracking-wider text-right">Precio</th>
                  <th className="p-4 text-xs font-black uppercase text-primary tracking-wider text-center">Estado</th>
                  <th className="p-4 text-xs font-black uppercase text-primary tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
               {isLoading || !isClient ? (
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                          <td className="p-4"><Skeleton className="h-5 w-3/4" /></td>
                          <td className="p-4"><Skeleton className="h-5 w-1/2" /></td>
                          <td className="p-4 text-right"><Skeleton className="h-5 w-1/4 ml-auto" /></td>
                          <td className="p-4 text-center"><Skeleton className="h-6 w-16 mx-auto" /></td>
                          <td className="p-4 text-center"><Skeleton className="h-8 w-20 mx-auto" /></td>
                      </tr>
                  ))}
                </tbody>
              ) : filteredProducts.length > 0 ? (
              <tbody className="divide-y divide-border/50">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-black/10 transition-colors group">
                    <td className="p-4">
                      <p className="font-bold text-foreground uppercase text-sm">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic">{product.category || 'Sin categoría'}</p>
                    </td>
                    <td className="p-4">
                       <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          product.stock <= (product.minStock || 0)
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                       <div>
                          <p className="font-black text-primary">{formatCurrency(product.price, 'USD')}</p>
                          {bcvRate && <p className="text-[10px] text-muted-foreground font-medium">{formatCurrency(product.price, 'VES')}</p>}
                        </div>
                    </td>
                    <td className="p-4 text-center">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className={product.status === 'active' ? 'bg-primary text-primary-foreground' : ''}>
                          {product.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </td>
                    <td className="p-4 text-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(product)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              ) : (
                <tbody>
                    <tr>
                        <td colSpan={5} className="text-center py-12">
                            <Package className="h-12 w-12 text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground">
                            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                                ? 'No se encontraron productos con los filtros aplicados'
                                : 'No hay productos registrados. ¡Agrega tu primer producto!'}
                            </p>
                        </td>
                    </tr>
                </tbody>
              )}
            </table>
          </div>
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
