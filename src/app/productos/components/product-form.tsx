'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  cost: z.coerce.number().min(0, 'El costo no puede ser negativo.').optional(),
  profitMargin: z.coerce.number().optional(),
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
}

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

export function ProductForm({
  open,
  onOpenChange,
  onSubmit,
  product,
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      price: 0,
      cost: 0,
      profitMargin: 0,
      stock: 0,
      minStock: 0,
      unit: 'unidad',
      supplier: '',
      status: 'active',
    },
  })

  // Observamos los cambios en costo y ganancia en tiempo real
  const watchedCost = useWatch({ control: form.control, name: 'cost' });
  const watchedProfit = useWatch({ control: form.control, name: 'profitMargin' });

  // Efecto para calcular el precio de venta inmediatamente
  useEffect(() => {
    const costValue = Number(watchedCost) || 0;
    const profitValue = Number(watchedProfit) || 0;

    if (costValue >= 0) {
      // Calculate in cents to avoid floating point issues
      const costInCents = Math.round(costValue * 100);
      const profitAmountInCents = Math.round(costInCents * (profitValue / 100));
      const newPriceInCents = costInCents + profitAmountInCents;
      const newPrice = newPriceInCents / 100;
      
      form.setValue('price', newPrice, { 
        shouldValidate: true,
        shouldDirty: true 
      });
    }
  }, [watchedCost, watchedProfit, form]);

  // Resetear el formulario cuando cambia el producto o se abre el modal
  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          ...product,
          name: product.name || '',
          description: product.description || '',
          category: product.category || '',
          price: product.price || 0,
          cost: product.cost || 0,
          profitMargin: product.profitMargin || 0,
          stock: product.stock || 0,
          minStock: product.minStock || 0,
          unit: product.unit || 'unidad',
          supplier: product.supplier || '',
          status: product.status || 'active',
        })
      } else {
        form.reset({
          name: '',
          description: '',
          category: '',
          price: 0,
          cost: 0,
          profitMargin: 0,
          stock: 0,
          minStock: 0,
          unit: 'unidad',
          supplier: '',
          status: 'active',
        })
      }
    }
  }, [product, form, open])

  const handleFormSubmit = (values: ProductFormValues) => {
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground font-bold">
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
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-foreground font-semibold">Nombre del Producto *</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-border/50 focus:ring-ring" placeholder="Ej: Harina Pan" />
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
                  <FormLabel className="text-foreground font-semibold">Descripción Corta</FormLabel>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-border/50">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Costo Base (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} className="border-border/50 focus:ring-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profitMargin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">% Margen de Ganancia</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="Ej: 25" {...field} className="border-border/50 focus:ring-ring" />
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
                  <FormLabel className="text-primary font-bold italic">Precio Final de Venta (USD)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      className="bg-muted/50 border-primary/20 font-bold text-primary" 
                      readOnly 
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground uppercase italic font-bold">Calculado automáticamente</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Existencia Inicial *</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="border-border/50 focus:ring-ring" />
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
                  <FormLabel className="text-foreground font-semibold">Alerta Stock Mínimo</FormLabel>
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
                  <FormLabel className="text-foreground font-semibold">Unidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad (ud)</SelectItem>
                      <SelectItem value="caja">Caja (cj)</SelectItem>
                      <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                      <SelectItem value="litro">Litro (lt)</SelectItem>
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
                  <FormLabel className="text-foreground font-semibold">Disponibilidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Disponible (Activo)</SelectItem>
                      <SelectItem value="inactive">No Disponible (Inactivo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2 pt-6 border-t border-border/20 mt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 min-w-[120px]">
                {product ? 'Guardar Cambios' : 'Registrar Producto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
