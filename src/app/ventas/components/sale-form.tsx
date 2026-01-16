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
  
  // EFECTO DE SINCRONIZACIÓN DE PRECIOS:
  // Actualiza los precios en el carrito si cambian en la lista maestra (products)
  useEffect(() => {
    if (cartItems.length > 0 && products.length > 0) {
      setCartItems(prevItems => 
        prevItems.map(item => {
          const freshProduct = products.find(p => p.id === item.id);
          if (freshProduct && freshProduct.price !== item.price) {
            return { ...item, price: freshProduct.price };
          }
          return item;
        })
      );
    }
  }, [products]);

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
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity, price: product.price } : item)
      }
      return [...prev, { ...product, quantity }]
    })
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

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
  
  const saleNumberFormatted = (saleCount + 1).toString().padStart(7, '0')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-background border-border/50 p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Columna Izquierda */}
            <div className="p-6 flex flex-col">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl text-foreground font-bold">Nueva Venta</DialogTitle>
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
                                  placeholder="Observaciones de la venta..."
                                  className="resize-none border-border/50"
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
                                <SelectTrigger>
                                  <SelectValue placeholder="Método de pago" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Efectivo</SelectItem>
                                <SelectItem value="card">Tarjeta / Punto</SelectItem>
                                <SelectItem value="transfer">Transferencia / Pago Móvil</SelectItem>
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
                             <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full justify-start text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: es })
                                    ) : (
                                      <span>Fecha de venta</span>
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
                    <div className="space-y-4 mt-auto pt-4">
                        <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full" variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Buscar Productos
                        </Button>
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-border text-center">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total a Pagar</p>
                            <p className="font-bold text-3xl text-primary">{formatBs(totalBs)}</p>
                            <p className="text-sm text-muted-foreground font-medium">{formatCurrency(totalUSD)} USD</p>
                        </div>
                        <Button type="submit" disabled={cartItems.length === 0} className="w-full text-lg h-12">
                            Registrar Venta
                        </Button>
                    </div>
                  </form>
                </Form>
            </div>

            {/* Columna Derecha (Ticket) */}
            <div className="p-6 bg-muted/40 flex flex-col border-l border-border/50">
              <div className="flex flex-col h-full">
                  <div className="border-2 border-dashed border-destructive/20 p-5 rounded-md w-full bg-background mb-4 shadow-sm">
                    <h3 className="text-xl font-black text-destructive text-center mb-4 italic">Recibo de Venta Nro. {saleNumberFormatted}</h3>
                    <div className="space-y-3">
                      <div className="flex font-bold text-[10px] uppercase text-muted-foreground border-b pb-2">
                        <div className="flex-1">Producto</div>
                        <div className="text-right w-20">USD</div>
                        <div className="text-right w-24">Bs.</div>
                        <div className="w-8 ml-2" />
                      </div>
                      <ScrollArea className="h-72 pr-4">
                         {cartItems.length === 0 ? (
                           <p className="text-center text-muted-foreground pt-24 text-sm italic">Agregue artículos...</p>
                         ) : (
                           cartItems.map(item => (
                            <div key={item.id} className="flex items-center text-sm py-2 border-b border-border/10 last:border-none">
                              <div className="flex-1 pr-2">
                                <p className="font-semibold truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">Cant: {item.quantity}</p>
                              </div>
                              <div className="text-right font-mono text-xs w-20">{formatCurrency(item.price * item.quantity)}</div>
                              <div className="text-right font-bold text-xs w-24">{formatBs(item.price * item.quantity * (bcvRate || 0))}</div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 group" onClick={() => handleRemoveItem(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive/70 group-hover:text-destructive" />
                              </Button>
                            </div>
                            ))
                         )}
                      </ScrollArea>
                    </div>
                  </div>
                  <div className="mt-auto flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground italic">Tasa BCV: {bcvRate ? formatBs(bcvRate) : 'N/A'}</p>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost" size="sm">Cerrar</Button>
                    </DialogClose>
                  </div>
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

// --- SUB-COMPONENTE CORREGIDO CON TIPOS DE TYPESCRIPT ---

interface ProductSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onAddProduct: (product: Product, quantity: number) => void;
}

function ProductSelectorModal({ open, onOpenChange, products, onAddProduct }: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [quantity, setQuantity] = useState<{[key: string]: number}>({})

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
      p.status === 'active' && 
      p.stock > 0
    )
  }, [products, searchTerm])

  const handleAdd = (product: Product) => {
    const q = quantity[product.id] || 1
    if(q > 0 && q <= product.stock) {
      onAddProduct(product, q)
      setQuantity(prev => ({...prev, [product.id]: 1}))
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold">Selección de Inventario</DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {filteredProducts.map((product: Product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                <div className="flex-1">
                  <p className="font-bold text-sm uppercase">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Existencia: <span className={product.stock <= 3 ? "text-red-500 font-bold" : "font-semibold"}>{product.stock}</span> | 
                    Precio Unitario: <span className="text-primary font-bold">{formatCurrency(product.price)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity[product.id] || '1'}
                    onChange={e => setQuantity(prev => ({...prev, [product.id]: parseInt(e.target.value) || 1}))}
                    className="w-16 h-8 text-center"
                  />
                  <Button size="sm" onClick={() => handleAdd(product)} className="h-8">
                    <Plus className="w-3 h-3 mr-1"/> Añadir
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-sm italic">No hay productos que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
