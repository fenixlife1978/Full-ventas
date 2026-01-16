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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { CalendarIcon, Plus, Search, Trash2, DollarSign, CreditCard, Landmark, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { type Product } from '@/app/productos/page'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

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
  onSubmit: (values: SaleFormValues & { items: CartItem[], totalAmount: number, saleNumber: number }) => void
  products: Product[]
  isLoadingProducts: boolean
  bcvRate: number | null
  saleCount: number
}

// Nueva Interfaz para corregir el error de TS
interface ProductSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  cartItems: CartItem[];
  onAddProduct: (product: Product, quantity: number) => void;
}

export function SaleForm({
  onSubmit,
  products,
  bcvRate,
  saleCount,
}: SaleFormProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false)
  const [selectedPriceCheckerProductId, setSelectedPriceCheckerProductId] = useState<string | null>(null)
  
  const { toast } = useToast()
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saleDate: new Date(),
      paymentMethod: 'cash',
      notes: '',
    },
  })

  const selectedPriceCheckerProduct = useMemo(() => {
      if (!selectedPriceCheckerProductId) return null;
      return products.find(p => p.id === selectedPriceCheckerProductId) ?? null;
  }, [selectedPriceCheckerProductId, products]);
  
  useEffect(() => {
    form.reset({
        saleDate: new Date(),
        paymentMethod: 'cash',
        notes: '',
    });
    setCartItems([]);
  }, [saleCount, form])

  const totalUSD = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * (item.quantity || 0), 0)
  }, [cartItems])

  const totalBs = useMemo(() => {
    return totalUSD * (bcvRate || 0)
  }, [totalUSD, bcvRate])

  const handleAddProduct = (product: Product, quantity: number) => {
    if (quantity > product.stock) {
      toast({ variant: 'destructive', title: 'Stock Insuficiente' });
      return;
    }
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
        toast({ variant: 'destructive', title: 'Ya está en el recibo' });
        return;
    }
    setCartItems(prev => [...prev, { ...product, quantity }]);
    setIsProductSelectorOpen(false);
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleFormSubmit = (values: SaleFormValues) => {
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Venta Vacía' });
      return;
    }
    onSubmit({ ...values, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-[#f8f7f2] overflow-hidden">
      
      {/* COLUMNA IZQUIERDA: FORMULARIO */}
      <div className="w-full lg:w-[40%] p-8 flex flex-col bg-white border-r border-gray-200 shadow-sm h-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-gray-800">Nueva Venta</h2>
          <Button onClick={() => setIsPriceCheckerOpen(true)} variant="outline" className="rounded-xl">
            <DollarSign className="mr-2 h-4 w-4" /> Consultar
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Método de Pago</Label>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'cash', label: 'Efectivo', icon: DollarSign },
                          { id: 'card', label: 'Tarjeta', icon: CreditCard },
                          { id: 'transfer', label: 'Pago Móvil', icon: Landmark },
                          { id: 'other', label: 'Otro', icon: Plus },
                        ].map((m) => (
                          <div key={m.id}>
                            <RadioGroupItem value={m.id} id={m.id} className="sr-only" />
                            <Label
                              htmlFor={m.id}
                              className={cn(
                                "flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all h-14",
                                field.value === m.id ? "bg-primary border-primary text-white shadow-md" : "border-gray-100 hover:bg-gray-50 text-gray-500"
                              )}
                            >
                              <m.icon className="mr-2 h-4 w-4" />
                              <span className="font-bold">{m.label}</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="saleDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full h-14 justify-start font-bold rounded-xl border-gray-100">
                            <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                            {field.value ? format(field.value, 'PPP', { locale: es }) : "Seleccionar"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Observaciones</Label>
                    <FormControl>
                      <Textarea placeholder="Notas de la venta..." className="min-h-[100px] bg-gray-50 border-none rounded-xl" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* TOTALES FIJOS ABAJO */}
            <div className="pt-6 mt-auto space-y-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsProductSelectorOpen(true)} 
                className="w-full h-14 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-primary hover:text-primary transition-all"
              >
                <Plus className="w-5 h-5 mr-2" /> Buscar Productos
              </Button>
              
              <div className="bg-[#f1f5f3] p-6 rounded-3xl border border-[#d1dbd6] text-center">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Total a Pagar</p>
                <p className="text-4xl font-black text-[#2d5a4c]">{formatBs(totalBs)}</p>
                <p className="text-sm font-bold text-gray-500">{totalUSD.toLocaleString('es-VE', { style: 'currency', currency: 'USD' })} USD</p>
              </div>

              <Button type="submit" disabled={cartItems.length === 0} className="w-full h-16 text-xl font-black rounded-2xl shadow-lg">
                REGISTRAR VENTA
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* COLUMNA DERECHA: RECIBO */}
      <div className="w-full lg:w-[60%] p-8 flex flex-col h-full overflow-hidden">
        <div className="flex-1 border-2 border-dashed border-red-200 rounded-[2.5rem] p-10 bg-white shadow-sm flex flex-col overflow-hidden relative">
          
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-red-500 italic tracking-tighter uppercase">Recibo de Venta</h3>
            <p className="text-[10px] font-mono text-gray-400 mt-1">Nro: {(saleCount + 1).toString().padStart(7, '0')}</p>
          </div>

          <div className="grid grid-cols-12 font-black text-[10px] uppercase text-gray-400 border-b-2 border-gray-50 pb-4 mb-2 px-2">
            <div className="col-span-6">Producto</div>
            <div className="col-span-2 text-center">Cant.</div>
            <div className="col-span-3 text-right">Subtotal</div>
            <div className="col-span-1" />
          </div>

          <ScrollArea className="flex-1 pr-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <p className="italic font-bold">Sin artículos...</p>
              </div>
            ) : (
              cartItems.map((item: CartItem) => (
                <div key={item.id} className="grid grid-cols-12 py-4 items-center border-b border-gray-50 group px-2">
                  <div className="col-span-6">
                    <p className="font-bold text-gray-800 text-sm uppercase">{item.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">${item.price.toFixed(2)} c/u</p>
                  </div>
                  <div className="col-span-2 text-center font-black text-gray-700">{item.quantity}</div>
                  <div className="col-span-3 text-right font-bold text-gray-800">
                    {formatBs(item.price * item.quantity * (bcvRate || 0))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-200 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>

          <div className="mt-auto pt-6 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 italic">
            <span>Tasa BCV: {bcvRate ? formatBs(bcvRate) : '---'}</span>
            <span>{format(new Date(), 'Pp', { locale: es })}</span>
          </div>
        </div>
      </div>

      {/* MODAL SELECCION PRODUCTOS */}
      <ProductSelectorModal
        open={isProductSelectorOpen}
        onOpenChange={setIsProductSelectorOpen}
        products={products}
        onAddProduct={handleAddProduct}
        cartItems={cartItems}
      />

      {/* MODAL CONSULTOR PRECIO */}
      <Dialog open={isPriceCheckerOpen} onOpenChange={setIsPriceCheckerOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader><DialogTitle>Consultar Precio</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Select onValueChange={setSelectedPriceCheckerProductId}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Producto..." /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedPriceCheckerProduct && (
              <Card className="bg-primary/5 border-none rounded-2xl p-6 text-center">
                <p className="text-4xl font-black text-primary">{formatBs(selectedPriceCheckerProduct.price * (bcvRate || 0))}</p>
                <p className="text-gray-500 font-bold mt-2">${selectedPriceCheckerProduct.price.toFixed(2)} USD</p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sub-componente con tipos corregidos
function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct }: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [qty, setQty] = useState<{[key: string]: number}>({})
  
  const cartIds = new Set(cartItems.map(i => i.id))
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !cartIds.has(p.id) && p.stock > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-[2rem]">
        <div className="p-8 border-b">
          <h2 className="text-2xl font-black mb-4">Añadir al Recibo</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12 rounded-xl" />
          </div>
        </div>
        <ScrollArea className="flex-1 p-8">
          <div className="space-y-3">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                <div>
                  <p className="font-bold text-gray-800 uppercase text-sm">{p.name}</p>
                   <p className="text-xs text-primary font-bold">
                        Stock: {p.stock} | Precio: {new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(p.price)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input type="number" min="1" max={p.stock} className="w-20 h-10 text-center" defaultValue="1" onChange={e => setQty({...qty, [p.id]: parseInt(e.target.value)})} />
                  <Button onClick={() => onAddProduct(p, qty[p.id] || 1)} size="sm" className="rounded-lg">Añadir</Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
