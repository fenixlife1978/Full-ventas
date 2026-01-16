'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormField,
  FormItem,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarIcon,
  Plus,
  Search,
  Trash2,
  DollarSign,
  CreditCard,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useEffect, useMemo, useState } from 'react'
import { type Product } from '@/app/productos/page'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'


const formSchema = z.object({
  saleDate: z.date({
    required_error: 'La fecha es requerida.',
  }),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
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
  bcvRate,
  saleCount,
}: SaleFormProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const { toast } = useToast()

  const paymentMethods = [
    { id: 'cash', label: 'Efectivo', icon: DollarSign },
    { id: 'card', label: 'Tarjeta', icon: CreditCard },
    { id: 'transfer', label: 'Transferencia', icon: Landmark },
    { id: 'other', label: 'Otro', icon: Plus },
  ];
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saleDate: new Date(),
      paymentMethod: 'cash',
    },
  })

  useEffect(() => {
    if(open) {
      form.reset({ saleDate: new Date(), paymentMethod: 'cash' });
      setCartItems([]);
    }
  }, [open, form])

  const totalUSD = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 0)), 0);
  }, [cartItems])

  const totalBs = useMemo(() => (bcvRate ? totalUSD * bcvRate : 0), [totalUSD, bcvRate])

  const handleAddProduct = (product: Product, quantity: number) => {
    if (quantity <= 0) return;
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
        toast({ variant: 'destructive', title: 'Producto ya está en el recibo' });
        return;
    }
    setCartItems(prev => [...prev, { ...product, quantity }]);
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleFormSubmit = (values: SaleFormValues) => {
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Venta Vacía', description: 'Agrega al menos un producto para registrar la venta.' });
      return;
    }
    onSubmit({ ...values, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
  const formatUSD = (value: number) => `USD ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full p-0 overflow-hidden bg-background">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid grid-cols-1 lg:grid-cols-2 h-[85vh]">
            
            {/* LEFT PANE */}
            <div className="p-8 space-y-6 flex flex-col bg-background">
              <DialogHeader className='p-0 text-left'>
                <DialogTitle className="text-4xl font-extrabold text-foreground tracking-tighter">Nueva<br/>Venta</DialogTitle>
              </DialogHeader>

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                      {paymentMethods.map(({ id, label, icon: Icon }) => (
                        <div key={id}>
                          <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                          <Label htmlFor={`pay-${id}`} className={cn(
                            "flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all min-w-[120px]",
                            field.value === id
                              ? "bg-primary text-primary-foreground border-primary shadow-lg"
                              : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                          )}>
                            <Icon className="mr-2 h-4 w-4" />
                            <span className="text-sm font-semibold">{label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormItem>
                )}
              />

              <div className="border-t border-primary/10 my-4" />
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha de Registro</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <CalendarIcon className="h-5 w-5 text-primary"/>
                    <span className="font-bold text-foreground">{format(form.getValues('saleDate'), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                </div>
              </div>
              
              <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-bold text-lg">
                <Plus className="mr-2"/>
                AGREGAR PRODUCTOS
              </Button>
              
              <div className="flex-grow"></div> {/* Spacer */}

              <div className="bg-primary/5 p-6 rounded-2xl text-center border-2 border-primary/10">
                <p className="text-sm font-bold text-primary/80 uppercase tracking-widest">Total a Pagar</p>
                <p className="text-5xl font-black text-primary my-1">{formatBs(totalBs)}</p>
                <p className="text-md font-bold text-primary/60 uppercase">{formatUSD(totalUSD)}</p>
              </div>

              <Button type="submit" className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-lg">
                REGISTRAR VENTA
              </Button>
            </div>

            {/* RIGHT PANE */}
            <div className="bg-muted/30 p-8 flex flex-col">
              <div className="flex-1 border-2 border-dashed border-border/50 rounded-3xl p-8 flex flex-col bg-background shadow-inner">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-destructive uppercase tracking-wider">Monitor de Venta</h2>
                  <div className="w-12 h-1 bg-destructive/20 mx-auto mt-2 rounded-full"/>
                </div>

                <div className="grid grid-cols-12 font-bold text-xs uppercase text-muted-foreground border-b-2 border-border/20 pb-3 my-6">
                  <div className="col-span-6">Descripción</div>
                  <div className="col-span-3 text-center">Cant.</div>
                  <div className="col-span-3 text-right">Subtotal</div>
                </div>

                <ScrollArea className="flex-1 pr-4 -mr-4">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col text-muted-foreground/30">
                       <div className="w-16 h-16 border-4 border-current border-t-transparent rounded-full animate-spin mb-4"/>
                       <p className="text-sm font-semibold">Esperando productos...</p>
                    </div>
                  ) : (
                    cartItems.map((item) => {
                       const subtotalBs = bcvRate ? (item.price * item.quantity) * bcvRate : 0;
                       return (
                          <div key={item.id} className="grid grid-cols-12 py-4 items-center text-foreground border-b border-border/30">
                              <div className="col-span-6 font-semibold pr-2">{item.name}</div>
                              <div className="col-span-3 text-center font-semibold text-primary">{item.quantity}</div>
                              <div className="col-span-3 text-right font-bold">{formatBs(subtotalBs)}</div>
                          </div>
                       )
                    })
                  )}
                </ScrollArea>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold pt-4 mt-auto">
                    <span>Venta #{saleCount + 1}</span>
                    <span>{format(new Date(), "dd/MM/yyyy, HH:mm")}</span>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <ProductSelectorModal
        open={isProductSelectorOpen}
        onOpenChange={setIsProductSelectorOpen}
        products={products}
        onAddProduct={handleAddProduct}
        cartItems={cartItems}
    />
    </>
  )
}


function ProductListItem({ product, onAddProduct }: {
  product: Product; onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [value, setValue] = useState('1');
  
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary/30 transition-all">
      <div className="flex-1">
        <p className="font-bold text-foreground uppercase text-sm tracking-tight">{product.name}</p>
        <div className="flex gap-3 mt-1">
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-500 uppercase">{product.unit}</span>
            <span className="text-[10px] font-black text-primary">Stock: {product.stock}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Input 
            type="number" 
            className="w-20 h-11 text-center font-bold rounded-xl bg-gray-100 border-gray-200" 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
        />
        <Button 
            onClick={() => { onAddProduct(product, parseFloat(value) || 0); setValue('1'); }} 
            className="h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90"
        >
            AÑADIR
        </Button>
      </div>
    </div>
  );
}

function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct }: {
  open: boolean; onOpenChange: (open: boolean) => void; products: Product[]; cartItems: CartItem[]; onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const cartIds = new Set(cartItems.map(i => i.id))
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !cartIds.has(p.id) && p.status === 'active' && p.stock > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none bg-gray-50">
        <DialogHeader className="p-8 pb-6">
          <DialogTitle className="text-2xl font-bold mb-4 tracking-tight">Buscar Artículos</DialogTitle>
        </DialogHeader>
        <div className="px-8 pb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
                placeholder="Escribe el nombre del producto..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-12 h-12 rounded-xl bg-white border-gray-200 text-md font-medium" 
            />
          </div>
        </div>
        <ScrollArea className="flex-1 px-8">
          <div className="grid gap-3 pb-8">
            {filtered.map(p => <ProductListItem key={p.id} product={p} onAddProduct={onAddProduct} />)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
