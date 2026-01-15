'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Product } from '../page'
import { useEffect } from 'react'

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  sku: z.string().min(1, 'El SKU es requerido.'),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  cost: z.coerce.number().optional(),
  stock: z.coerce.number().int('El stock debe ser un número entero.'),
  minStock: z.coerce.number().int('El stock mínimo debe ser un número entero.').optional(),
  unit: z.string().optional(),
  supplier: z.string().optional(),
  status: z.enum(['active', 'inactive']),
})

export type ProductFormValues = z.infer<typeof formSchema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProductFormValues) => void
  product: Product | null
  categories: string[]
}

export function ProductForm({
  open,
  onOpenChange,
  onSubmit,
  product,
  categories
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      cost: undefined,
      stock: 0,
      minStock: 0,
      unit: 'unidad',
      supplier: '',
      status: 'active',
    },
  })

  useEffect(() => {
    if (product) {
      form.reset({
        ...product,
        cost: product.cost || undefined,
        minStock: product.minStock || 0
      })
    } else {
      form.reset({
        name: '',
        sku: '',
        description: '',
        category: '',
        price: 0,
        cost: undefined,
        stock: 0,
        minStock: 0,
        unit: 'unidad',
        supplier: '',
        status: 'active',
      })
    }
  }, [product, form, open])

  const handleFormSubmit = (values: ProductFormValues) => {
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border/50">
            <DialogHeader>
              <DialogTitle className="text-2xl text-foreground">
                {product ? 'Editar Producto' : 'Agregar Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-border/50 focus:ring-ring" required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">SKU *</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-border/50 focus:ring-ring" required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-foreground font-semibold">Descripción</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-border/50 focus:ring-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Categoría</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-border/50 focus:ring-ring" list="categories" />
                  </FormControl>
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Proveedor</FormLabel>
                  <FormControl>
                     <Input {...field} className="border-border/50 focus:ring-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Precio de Venta *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} className="border-border/50 focus:ring-ring" required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Costo</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} className="border-border/50 focus:ring-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Stock Actual *</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="border-border/50 focus:ring-ring" required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="minStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Stock Mínimo</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="border-border/50 focus:ring-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                 <FormItem>
                  <FormLabel className="text-foreground font-semibold">Unidad de Medida</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-border/50 focus:ring-ring">
                        <SelectValue placeholder="Selecciona una unidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="kg">Kilogramo</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="metro">Metro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Estado</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-border/50 focus:ring-ring">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2 pt-4">
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {product ? 'Actualizar' : 'Crear'} Producto
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
