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
  X
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
        toast({ variant: 'destructive', title: 'El producto ya está en el monitor' });
        return;
    }
    setCartItems(prev => [...prev, { ...product, quantity }]);
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleFormSubmit = (values: SaleFormValues) => {
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Venta Vacía', description: 'Agrega productos al monitor antes de registrar.' });
      return;
    }
    onSubmit({ ...values, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(value)}`
  const formatUSD = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-none rounded-none bg-[#F8F9F8] flex flex-col overflow-hidden">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
                
                <DialogHeader className="h-16 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <DialogTitle className="text-2xl font-black text-[#1A1C1E] tracking-tight">Nueva Venta</DialogTitle>
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-2">
                                {paymentMethods.map(({ id, label, icon: Icon }) => (
                                    <div key={id}>
                                        <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                                        <Label
                                            htmlFor={`pay-${id}`}
                                            className={cn(
                                                "flex items-center px-4 py-2 rounded-xl border transition-all h-10 text-xs font-black cursor-pointer uppercase tracking-wider",
                                                field.value === id ? "bg-[#107C41] border-[#107C41] text-white shadow-lg shadow-[#107C41]/20" : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                                            )}
                                        >
                                            <Icon className="mr-2 h-4 w-4" /> {label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" className="rounded-xl border-gray-200 h-10 font-bold text-gray-600">
                             <DollarSign className="mr-2 h-4 w-4 text-[#107C41]" /> Consultar Precio
                        </Button>
                        <Button type="button" onClick={() => onOpenChange(false)} variant="ghost" className="rounded-full h-10 w-10 p-0">
                            <X className="h-6 w-6 text-gray-400" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    
                    <aside className="w-[400px] p-6 flex flex-col justify-between shrink-0 border-r border-gray-100">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">FECHA DE REGISTRO</Label>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 font-bold text-sm text-gray-600">
                                    <CalendarIcon className="h-5 w-5 text-[#107C41]" />
                                    <span>{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
                                </div>
                            </div>

                            <Button 
                                type="button" 
                                onClick={() => setIsProductSelectorOpen(true)} 
                                className="w-full h-14 bg-black text-white hover:bg-black/90 rounded-2xl font-black text-base shadow-xl"
                            >
                                <Plus className="w-5 h-5 mr-2" /> AGREGAR PRODUCTOS
                            </Button>

                            <div className="bg-[#E7F3ED] p-6 rounded-3xl border border-[#107C41]/10 text-center space-y-1 shadow-inner">
                                <p className="text-[10px] uppercase font-black text-[#107C41]/60 tracking-widest">TOTAL A PAGAR</p>
                                <p className="text-5xl font-black text-[#107C41] tracking-tighter">
                                    {formatBs(totalBs)}
                                </p>
                                <p className="text-lg font-bold text-gray-400">
                                    {formatUSD(totalUSD)}
                                </p>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-20 text-xl font-black rounded-2xl bg-[#107C41] hover:bg-[#0D6334] text-white shadow-2xl shadow-[#107C41]/20 transition-all active:scale-95"
                        >
                            REGISTRAR VENTA
                        </Button>
                    </aside>

                    <main className="flex-1 p-6 overflow-hidden flex flex-col">
                        <div className="flex-1 bg-white border-2 border-dashed border-gray-200 rounded-3xl flex flex-col overflow-hidden p-8 shadow-inner">
                            
                            <div className="text-center mb-6">
                                <h3 className="text-4xl font-black text-[#E94E4E] italic tracking-tighter uppercase opacity-90">MONITOR DE VENTA</h3>
                                <div className="h-1 w-24 bg-[#FDEAEA] mx-auto mt-2 rounded-full" />
                            </div>

                            <div className="grid grid-cols-12 font-black text-[10px] uppercase text-gray-300 border-b border-gray-100 pb-4 mb-2 px-4 tracking-widest">
                                <div className="col-span-5">DESCRIPCIÓN</div>
                                <div className="col-span-2 text-center">UNIDAD</div>
                                <div className="col-span-2 text-center">CANTIDAD</div>
                                <div className="col-span-3 text-right">SUB-TOTAL</div>
                            </div>

                            <ScrollArea className="flex-1 px-4">
                                {cartItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-200 py-20 opacity-30">
                                        <Plus className="w-12 h-12 mb-4" />
                                        <p className="font-bold text-base uppercase tracking-widest">Esperando Artículos...</p>
                                    </div>
                                ) : (
                                    cartItems.map((item) => {
                                        const subUSD = item.price * item.quantity;
                                        const subBs = bcvRate ? subUSD * bcvRate : 0;
                                        return (
                                            <div key={item.id} className="grid grid-cols-12 py-4 items-center border-b border-gray-50 group">
                                                <div className="col-span-5">
                                                    <p className="font-bold text-gray-800 text-sm uppercase leading-none mb-1">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{formatUSD(item.price)} unitario</p>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-1 rounded">
                                                        {item.unit || 'UD'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <span className="text-base font-black text-[#107C41] bg-[#E7F3ED] w-10 h-10 flex items-center justify-center rounded-lg">
                                                        {item.quantity}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 text-right flex items-center justify-end gap-2">
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-base leading-none">{formatBs(subBs)}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold">{formatUSD(subUSD)}</p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="h-9 w-9 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </ScrollArea>

                            <div className="mt-6 pt-6 border-t-2 border-double border-gray-100 flex justify-between items-center px-4">
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Nº OPERACIÓN</p>
                                        <p className="font-medium text-xs text-gray-600">VENTA #{saleCount + 1}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">HORA REGISTRO</p>
                                        <p className="font-medium text-xs text-gray-600">{format(new Date(), "HH:mm:ss")}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">TASA BCV</p>
                                     <p className="font-bold text-sm text-[#107C41]">1 USD = {bcvRate ? `Bs. ${bcvRate.toFixed(2)}` : '---'}</p>
                                </div>
                            </div>
                        </div>
                    </main>
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
        bcvRate={bcvRate}
    />
    </>
  )
}

function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct, bcvRate }: {
  open: boolean; onOpenChange: (open: boolean) => void; products: Product[]; cartItems: CartItem[]; onAddProduct: (product: Product, quantity: number) => void; bcvRate: number | null;
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const cartIds = new Set(cartItems.map(i => i.id))
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !cartIds.has(p.id) && p.status === 'active')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none bg-[#F8F9F8]">
        <DialogHeader className="p-8 pb-6 bg-white border-b border-gray-100">
          <DialogTitle className="text-2xl font-black mb-4 tracking-tight">Seleccionar Productos</DialogTitle>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input 
                placeholder="Escribe el nombre del producto..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-12 h-12 rounded-xl bg-[#F8F9F8] border-none text-base font-bold" 
            />
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="grid gap-3">
            {filtered.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#107C41]/30 transition-all group">
                    <div className="flex-1">
                        <p className="font-bold text-gray-800 uppercase text-sm">{p.name}</p>
                        <div className="flex gap-3 mt-1">
                            <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-500 uppercase">{p.unit}</span>
                            <span className="text-[9px] font-black text-[#107C41]">Stock: {p.stock}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                            <p className="font-bold text-sm text-gray-800">{bcvRate ? `Bs. ${(p.price * bcvRate).toFixed(2)}` : '--'}</p>
                            <p className="text-[10px] font-bold text-gray-400">USD {p.price.toFixed(2)}</p>
                        </div>
                        <Button 
                            onClick={() => { onAddProduct(p, 1); onOpenChange(false); }} 
                            className="h-10 px-5 rounded-lg font-bold bg-[#107C41] hover:bg-[#0D6334]"
                        >
                            AÑADIR
                        </Button>
                    </div>
                </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
