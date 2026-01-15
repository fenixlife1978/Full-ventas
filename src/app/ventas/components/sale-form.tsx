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
import { Card, CardContent } from '@/components/ui/card'

const formSchema = z.object({
  productId: z.string().min(1, 'Debe seleccionar un producto.'),
  quantity: z.coerce.number().min(0.01, 'La cantidad debe ser mayor a 0.'),
  saleDate: z.date({
    required_error: 'La fecha de venta es requerida.',
  }),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
  notes: z.string().optional(),
})

export type SaleFormValues = z.infer<typeof formSchema>

interface SaleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SaleFormValues) => void
  products: Product[]
  isLoadingProducts: boolean
}

export function SaleForm({
  open,
  onOpenChange,
  onSubmit,
  products,
  isLoadingProducts
}: SaleFormProps) {
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      saleDate: new Date(),
      paymentMethod: 'cash',
      notes: '',
    },
  })
  
  useEffect(() => {
    if(!open) {
      form.reset({
        productId: '',
        quantity: 1,
        saleDate: new Date(),
        paymentMethod: 'cash',
        notes: '',
      })
    }
  }, [open, form])


  const selectedProductId = form.watch('productId')
  const quantity = form.watch('quantity')
  
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId)
  }, [products, selectedProductId])

  const totalAmount = useMemo(() => {
    if (!selectedProduct || !quantity) return 0;
    return selectedProduct.price * quantity
  }, [selectedProduct, quantity])

  const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#f7f4ed] border-[#00704a]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#00704a]">Registrar Nueva Venta</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00704a] font-semibold">Producto *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingProducts}>
                    <FormControl>
                      <SelectTrigger className="border-[#00704a] focus:ring-[#00704a]">
                        <SelectValue placeholder={isLoadingProducts ? "Cargando..." : "Selecciona un producto"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id} disabled={product.stock === 0}>
                         {product.name} - Stock: {product.stock} {product.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedProduct && (
                <Card className="bg-[#e8dcc4] border-[#00704a]">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-[#6b5d4f]">Precio:</p>
                          <p className="font-semibold text-[#00704a]">
                            {formatCurrency(selectedProduct.price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#6b5d4f]">Stock disponible:</p>
                          <p className="font-semibold text-[#00704a]">
                            {selectedProduct.stock} {selectedProduct.unit}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00704a] font-semibold">Cantidad *</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" min="1" {...field} className="border-[#00704a] focus:ring-[#00704a]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedProduct && quantity > 0 && (
                <Card className="bg-[#00704a] border-[#005a3c]">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Total a pagar:</span>
                        <span className="text-2xl font-bold text-white">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
            )}


            <FormField
              control={form.control}
              name="saleDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-[#00704a] font-semibold">Fecha de Venta</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal border-[#00704a]',
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
            
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00704a] font-semibold">Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-[#00704a] focus:ring-[#00704a]">
                        <SelectValue placeholder="Seleccione un método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00704a] font-semibold">Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Añada notas adicionales sobre la venta"
                      className="resize-none border-[#00704a] focus:ring-[#00704a]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[#00704a] text-[#00704a] hover:bg-[#00704a] hover:text-white">
                  Cancelar
                </Button>
              <Button type="submit" disabled={!selectedProduct || !(quantity > 0)} className="bg-[#00704a] hover:bg-[#005a3c] text-white">
                Registrar Venta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
