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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useMemo } from 'react'
import { type Product } from '@/app/productos/page'

const formSchema = z.object({
  productId: z.string().min(1, 'Debe seleccionar un producto.'),
  quantity: z.coerce.number().min(0.01, 'La cantidad debe ser mayor que 0.'),
  unitCost: z.coerce.number().min(0, 'El costo no puede ser negativo.'),
  purchaseDate: z.date({
    required_error: 'La fecha de compra es requerida.',
  }),
  supplier: z.string().min(1, 'El proveedor es requerido.'),
  paymentMethod: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito']),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
})

export type PurchaseFormValues = z.infer<typeof formSchema>

interface PurchaseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PurchaseFormValues) => void
  products: Product[]
  isLoadingProducts: boolean
}

export function PurchaseForm({
  open,
  onOpenChange,
  onSubmit,
  products,
  isLoadingProducts
}: PurchaseFormProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      unitCost: 0,
      purchaseDate: new Date(0),
      supplier: '',
      paymentMethod: 'Efectivo',
      invoiceNumber: '',
      notes: '',
    },
  })
  
  const selectedProductId = form.watch('productId')
  const quantity = form.watch('quantity')
  const unitCost = form.watch('unitCost')

  useEffect(() => {
    if(open) {
      form.reset({
        productId: '',
        quantity: 1,
        unitCost: 0,
        purchaseDate: new Date(),
        supplier: '',
        paymentMethod: 'Efectivo',
        invoiceNumber: '',
        notes: '',
      })
    }
  }, [open, form])

  useEffect(() => {
      const product = products.find(p => p.id === selectedProductId)
      if(product && product.cost) {
        form.setValue('unitCost', product.cost)
      } else if (product) {
        form.setValue('unitCost', 0)
      }
  }, [selectedProductId, products, form])

  const totalAmount = useMemo(() => {
    return (quantity || 0) * (unitCost || 0)
  }, [quantity, unitCost])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">Registrar Nueva Compra</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">Producto *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingProducts}>
                      <FormControl>
                        <SelectTrigger className="border-border/50 focus:ring-ring">
                          <SelectValue placeholder={isLoadingProducts ? "Cargando..." : "Seleccionar producto"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                          {product.name} - Stock: {product.stock || 0}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">Cantidad *</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" {...field} className="border-border/50 focus:ring-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">Costo Unitario (USD) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="border-border/50 focus:ring-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">Proveedor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} className="border-border/50 focus:ring-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">Método de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-border/50 focus:ring-ring">
                          <SelectValue placeholder="Seleccione un método de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Crédito">Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold">Nº Factura (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: F-2024-1234" {...field} className="border-border/50 focus:ring-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-foreground font-semibold">Fecha de Compra</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal border-border/50 focus:ring-ring',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Seleccione una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-semibold">Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Añada notas adicionales sobre la compra"
                      className="resize-none border-border/50 focus:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {totalAmount > 0 && (
                <div className="bg-primary text-primary-foreground p-4 rounded-lg">
                    <p className="text-lg font-bold">
                    Total: {new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(totalAmount)}
                    </p>
                </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                    Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                Registrar Compra
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
