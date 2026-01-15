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
  DialogFooter,
  DialogClose,
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
import { CalendarIcon, Plus, Search, Trash2, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { type Product } from '@/app/productos/page'
import { ScrollArea } from '@/components/ui/scroll-area'

const formSchema = z.object({
  saleDate: z.date({
    required_error: 'La fecha de venta es requerida.',
  }),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
  notes: z.string().optional(),
})

export type SaleFormValues = z.infer<typeof formSchema>

export interface CartItem extends Product {
  quantity: number
}

interface SaleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SaleFormValues & { items: CartItem[], totalAmount: number, saleNumber: number }) => void
  products: Product[]
  isLoadingProducts: boolean
  bcvRate: number | null
  saleCount: number
}

export function SaleForm({
  open,
  onOpenChange,
  onSubmit,
  products,
  isLoadingProducts,
  bcvRate,
  saleCount,
}: SaleFormProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saleDate: new Date(),
      paymentMethod: 'cash',
      notes: '',
    },
  })
  
  useEffect(() => {
    if(!open) {
      form.reset()
      setCartItems([])
    }
  }, [open, form])


  const totalUSD = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  }, [cartItems])

  const totalBs = useMemo(() => {
    return totalUSD * (bcvRate || 0)
  }, [totalUSD, bcvRate])


  const handleAddProduct = (product: Product, quantity: number) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id)
      if (existingItem) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
      }
      return [...prev, { ...product, quantity }]
    })
  }

  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId))
  }

  const handleFormSubmit = (values: SaleFormValues) => {
    onSubmit({
      ...values,
      items: cartItems,
      totalAmount: totalUSD,
      saleNumber: saleCount + 1,
    })
  }

  const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatBs = (value: number) => {
    return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)}`
  }
  
  const saleNumberFormatted = (saleCount + 1).toString().padStart(3, '0')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-background border-border/50 p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Column */}
            <div className="p-6 flex flex-col">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl text-foreground">Registrar Venta</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 flex-grow flex flex-col">
                    <div className="space-y-4 flex-grow">
                      <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder="Nota Opcional"
                                  className="resize-none border-border/50 focus:ring-ring"
                                  {...field}
                                />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-border/50 focus:ring-ring">
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
                        name="saleDate"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel className="text-sm text-muted-foreground mt-2">Fecha de venta:</FormLabel>
                             <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full justify-start text-left font-normal border-border/50',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: es })
                                    ) : (
                                      <span>Seleccione una fecha</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-4 mt-auto">
                        <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full">
                            Seleccione Producto
                        </Button>
                        <Input
                            readOnly
                            value={`TOTAL Venta Bs. ${totalBs.toFixed(2)}`}
                            className="text-center font-bold text-lg h-12"
                        />
                        <Button type="submit" disabled={cartItems.length === 0} className="w-full text-lg h-12">
                            Registrar Venta
                        </Button>
                    </div>
                  </form>
                </Form>
            </div>

            {/* Right Column */}
            <div className="p-6 bg-muted/50 flex flex-col border-l border-border/50">
              <div className="flex justify-between items-start mb-4">
                  <div className="border border-destructive/50 p-4 rounded-md w-full">
                    <h3 className="text-xl font-bold text-destructive text-center mb-2">VENTA Nº{saleNumberFormatted}</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 font-semibold text-foreground">
                        <div className="col-span-1">Producto</div>
                        <div className="text-right">USD</div>
                        <div className="text-right">Bs.</div>
                      </div>
                      <ScrollArea className="h-64 pr-4">
                         {cartItems.length === 0 ? (
                           <p className="text-center text-muted-foreground pt-10">Agregue productos a la venta</p>
                         ) : (
                           cartItems.map(item => (
                            <div key={item.id} className="grid grid-cols-3 items-center text-sm py-1 border-b border-border/20 last:border-none">
                              <div className="col-span-1 truncate pr-2">{item.name} <span className="text-muted-foreground">x{item.quantity}</span></div>
                              <div className="text-right">{formatCurrency(item.price * item.quantity)}</div>
                              <div className="text-right">{formatBs(item.price * item.quantity * (bcvRate || 0))}</div>
                            </div>
                           ))
                         )}
                      </ScrollArea>
                    </div>
                  </div>
              </div>
               <div className="mt-auto text-right">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ProductSelectorModal
        open={isProductSelectorOpen}
        onOpenChange={setIsProductSelectorOpen}
        products={products}
        onAddProduct={handleAddProduct}
      />
    </>
  )
}


function ProductSelectorModal({ open, onOpenChange, products, onAddProduct }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [quantity, setQuantity] = useState<{[key: string]: number}>({})

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.status === 'active' && p.stock > 0)
  }, [products, searchTerm])

  const handleAdd = (product: Product) => {
    const q = quantity[product.id] || 1
    if(q > 0 && q <= product.stock) {
      onAddProduct(product, q)
      setQuantity(prev => ({...prev, [product.id]: 1}))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar Productos</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-96">
          <div className="space-y-2 pr-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted">
                <div className="flex-1">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">Stock: {product.stock} | Precio: {format(product.price, {style: 'currency', currency: 'USD'})}</p>
                </div>
                <Input 
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity[product.id] || '1'}
                  onChange={e => setQuantity(prev => ({...prev, [product.id]: parseInt(e.target.value)}))}
                  className="w-20"
                />
                <Button size="sm" onClick={() => handleAdd(product)}><Plus className="w-4 h-4 mr-1"/> Agregar</Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
