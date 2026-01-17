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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
  ShoppingBag,
  FileText,
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
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  saleDate: z.date({
    required_error: 'La fecha es requerida.',
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
      notes: '',
    },
  })

  useEffect(() => {
    if(open) {
      form.reset({ saleDate: new Date(), paymentMethod: 'cash', notes: '' });
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

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    const productInStock = products.find(p => p.id === productId);

    if (productInStock && newQuantity > productInStock.stock) {
        toast({
            variant: 'destructive',
            title: 'Stock insuficiente',
            description: `Solo quedan ${productInStock.stock} unidades.`
        });
        setCartItems(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, quantity: productInStock.stock } : item
            )
        );
        return;
    }

    setCartItems(prev =>
        prev.map(item =>
            item.id === productId ? { ...item, quantity: isNaN(newQuantity) ? 0 : newQuantity } : item
        )
    );
  };


  const handleFormSubmit = (values: SaleFormValues) => {
    const validItems = cartItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'Venta Vacía', description: 'Debes agregar al menos un producto con una cantidad válida.' });
      return;
    }
    const validTotalUSD = validItems.reduce((acc, item) => acc + (item.price * (item.quantity || 0)), 0);
    onSubmit({ ...values, items: validItems, totalAmount: validTotalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(value)}`
  const formatUSD = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="h-full flex flex-col bg-[#F8F9F8]">
                <DialogHeader className="px-8 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
                    <DialogTitle className="flex items-center gap-4 text-left">
                        <div className="bg-[#107C41] p-3 rounded-2xl">
                            <ShoppingBag className="text-white h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-black text-[#1A1C1E] tracking-tight">NUEVA VENTA</h2>
                    </DialogTitle>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-500 font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100">
                            <CalendarIcon className="h-4 w-4 text-[#107C41]" />
                            <span className="text-xs">{format(new Date(), "d 'de' MMMM", { locale: es })}</span>
                        </div>
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-1.5">
                                {paymentMethods.map(({ id, label, icon: Icon }) => (
                                    <div key={id}>
                                        <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                                        <Label
                                            htmlFor={`pay-${id}`}
                                            className={cn(
                                                "flex items-center px-3 py-1 rounded-lg border transition-all h-9 text-[10px] font-black cursor-pointer uppercase tracking-wider",
                                                field.value === id ? "bg-[#107C41] border-[#107C41] text-white shadow-lg shadow-[#107C41]/20" : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                                            )}
                                        >
                                            <Icon className="mr-1.5 h-3 w-3" /> {label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            )}
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-row overflow-hidden">
                    
                    <div className="w-[380px] bg-white p-6 flex flex-col border-r border-gray-100">
                        <div className="space-y-6">
                            <Button 
                                type="button" 
                                onClick={() => setIsProductSelectorOpen(true)} 
                                className="w-full h-16 bg-black text-white hover:bg-black/90 rounded-2xl font-black text-lg shadow-xl transition-transform active:scale-95"
                            >
                                <Search className="w-5 h-5 mr-3" /> AGREGAR PRODUCTO
                            </Button>

                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                                        <FileText className="w-3 h-3" />
                                        Observaciones
                                    </Label>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Añadir nota a la venta..."
                                      className="resize-none border-border/50 focus:ring-ring rounded-2xl text-xs h-24 bg-background"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-1">
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">TOTAL</p>
                                <p className="text-5xl font-black text-[#107C41] tracking-tighter">
                                    {formatBs(totalBs)}
                                </p>
                                <div className="flex items-center justify-center gap-2 text-lg font-bold text-gray-400">
                                    <span>{formatUSD(totalUSD)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-6">
                            <Button type="submit" className="w-full h-20 text-xl font-black rounded-2xl bg-[#8DBDA2] hover:bg-[#7CAF93] text-white shadow-2xl shadow-[#8DBDA2]/30 transition-all active:scale-95">
                                REGISTRAR VENTA
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col overflow-hidden">
                        <div className="flex-1 border-4 border-dashed border-gray-100 rounded-3xl p-8 flex flex-col overflow-hidden">
                            
                            <div className="flex justify-between items-end mb-8 px-2">
                                <div>
                                    <h3 className="text-3xl font-black text-[#E94E4E] italic tracking-tighter uppercase">MONITOR DE VENTA</h3>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Venta #{saleCount + 1}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Artículos</p>
                                    <p className="text-xl font-black text-gray-800">{cartItems.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 font-black text-[9px] uppercase text-gray-400 border-b border-gray-100 pb-3 mb-1 px-4 tracking-widest">
                                <div className="col-span-5">Descripción</div>
                                <div className="col-span-2 text-center">Cant.</div>
                                <div className="col-span-2 text-right">Precio Unit.</div>
                                <div className="col-span-3 text-right">Sub-total</div>
                            </div>

                            <ScrollArea className="flex-1 px-4">
                                {cartItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 py-24 opacity-60">
                                        <div className="w-16 h-16 border-4 border-dashed border-current rounded-full flex items-center justify-center mb-4">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <p className="font-bold text-sm uppercase tracking-widest">Esperando productos...</p>
                                    </div>
                                ) : (
                                    cartItems.map((item) => {
                                        const subtotalUSD = item.price * (item.quantity || 0);
                                        return (
                                            <div key={item.id} className="grid grid-cols-12 py-3.5 items-center border-b border-gray-50 group transition-all hover:bg-gray-50/50">
                                                <div className="col-span-5">
                                                    <p className="font-black text-foreground text-xs uppercase leading-tight">{item.name}</p>
                                                    <p className="text-[9px] text-muted-foreground font-bold">{item.unit}</p>
                                                </div>
                                                
                                                <div className="col-span-2 flex justify-center">
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value))}
                                                        onBlur={(e) => {
                                                            if (parseFloat(e.target.value) <= 0) {
                                                                handleRemoveItem(item.id);
                                                                toast({
                                                                    description: `${item.name} fue eliminado del recibo.`
                                                                })
                                                            }
                                                        }}
                                                        className="w-16 h-8 text-center font-bold rounded-md bg-gray-100 border-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        min="0"
                                                        step={item.unit === 'unidad' ? '1' : '0.01'}
                                                    />
                                                </div>

                                                <div className="col-span-2 text-right text-xs font-medium text-muted-foreground">
                                                    {formatUSD(item.price)}
                                                </div>

                                                <div className="col-span-3 text-right flex items-center justify-end gap-2">
                                                    <div className="text-right">
                                                        <p className="font-bold text-foreground text-sm leading-none">{formatUSD(subtotalUSD)}</p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleRemoveItem(item.id)} 
                                                        className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full h-7 w-7 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </ScrollArea>
                             <div className="mt-auto pt-6 border-t-2 border-dashed border-gray-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">SUB-TOTAL</span>
                                    <span className="font-bold text-foreground">{formatUSD(totalUSD)}</span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">TOTAL (Bs.)</span>
                                    <span className="font-bold text-foreground">{formatBs(totalBs)}</span>
                                </div>
                             </div>
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
        cartItems={cartItems}
        onAddProduct={handleAddProduct}
        bcvRate={bcvRate}
    />
    </>
  )
}

function ProductListItem({ product, onAddProduct }: {
  product: Product; onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [value, setValue] = useState('1');
  
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#107C41]/30 transition-all">
      <div className="flex-1">
        <p className="font-black text-[#1A1C1E] uppercase text-xs tracking-tight">{product.name}</p>
        <div className="flex gap-2 mt-1">
            <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded font-black text-gray-500 uppercase">{product.unit}</span>
            <span className="text-[9px] font-black text-[#107C41]">Stock: {product.stock}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input 
            type="number" 
            className="w-16 h-10 text-center font-black rounded-xl bg-gray-50 border-none" 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            step={product.unit === 'unidad' ? '1' : '0.01'}
            min="0.01"
        />
        <Button 
            onClick={() => { onAddProduct(product, parseFloat(value)); setValue('1'); }} 
            className="h-10 px-5 rounded-xl font-black bg-[#107C41] hover:bg-[#0D6334]"
        >
            AÑADIR
        </Button>
      </div>
    </div>
  );
}

function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct, bcvRate }: {
  open: boolean; onOpenChange: (open: boolean) => void; products: Product[]; cartItems: CartItem[]; onAddProduct: (product: Product, quantity: number) => void; bcvRate: number | null;
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const cartIds = new Set(cartItems.map(i => i.id))
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !cartIds.has(p.id) && p.status === 'active')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="sr-only">Buscar Productos</DialogTitle>
      </DialogHeader>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none bg-[#F8F9F8]">
        <div className="p-8 pb-4 bg-white border-b border-gray-100">
          <h2 className="text-2xl font-black mb-4 tracking-tight text-left">Buscar Artículos</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <Input 
                placeholder="Nombre del producto..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-12 h-12 rounded-xl bg-[#F8F9F8] border-none text-base font-bold" 
            />
          </div>
        </div>
        <ScrollArea className="flex-1 px-6 pt-6">
          <div className="grid gap-3">
            {filtered.map(p => <ProductListItem key={p.id} product={p} onAddProduct={onAddProduct} />)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
