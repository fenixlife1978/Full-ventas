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
  ShoppingBag
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
      toast({ variant: 'destructive', title: 'Venta Vacía' });
      return;
    }
    onSubmit({ ...values, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(value)}`
  const formatUSD = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
                
                {/* Header */}
                <div className="px-10 py-6 bg-[#F8F9F8] border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#107C41] p-3 rounded-2xl">
                            <ShoppingBag className="text-white h-6 w-6" />
                        </div>
                        <h2 className="text-3xl font-black text-[#1A1C1E] tracking-tight">Nueva Venta</h2>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-gray-500 font-bold bg-white px-4 py-2 rounded-xl border border-gray-100">
                            <CalendarIcon className="h-4 w-4 text-[#107C41]" />
                            <span className="text-sm">{format(new Date(), "d 'de' MMMM", { locale: es })}</span>
                        </div>
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
                                            <Icon className="mr-2 h-3.5 w-3.5" /> {label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            )}
                        />
                    </div>
                </div>

                <div className="flex-1 flex flex-row overflow-hidden bg-white">
                    
                    {/* COLUMNA IZQUIERDA: BUSQUEDA Y TOTALES */}
                    <div className="w-[450px] bg-[#F8F9F8] p-8 flex flex-col border-r border-gray-100">
                        <div className="space-y-8">
                            <section>
                                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 mb-3 block">Acciones</Label>
                                <Button 
                                    type="button" 
                                    onClick={() => setIsProductSelectorOpen(true)} 
                                    className="w-full h-20 bg-black text-white hover:bg-black/90 rounded-[2rem] font-black text-xl shadow-xl transition-transform active:scale-95"
                                >
                                    <Search className="w-6 h-6 mr-3" /> BUSCAR PRODUCTOS
                                </Button>
                            </section>

                            <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-2">
                                <p className="text-[11px] uppercase font-black text-[#107C41] tracking-[0.2em]">TOTAL A PAGAR</p>
                                <p className="text-6xl font-black text-[#107C41] tracking-tighter">
                                    {formatBs(totalBs)}
                                </p>
                                <div className="flex items-center justify-center gap-2 text-xl font-bold text-gray-400">
                                    <span>{formatUSD(totalUSD)}</span>
                                </div>
                            </section>

                            <div className="bg-[#E7F3ED] px-6 py-4 rounded-2xl flex justify-between items-center">
                                <span className="text-xs font-black text-[#107C41]/70 uppercase tracking-widest">Tasa BCV</span>
                                <span className="font-black text-[#107C41]">{bcvRate ? `Bs. ${bcvRate.toFixed(2)}` : '---'}</span>
                            </div>
                        </div>

                        <div className="mt-auto pt-8">
                            <Button type="submit" className="w-full h-24 text-2xl font-black rounded-[2.5rem] bg-[#8DBDA2] hover:bg-[#7CAF93] text-white shadow-2xl shadow-[#8DBDA2]/30 transition-all active:scale-95">
                                REGISTRAR VENTA
                            </Button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: MONITOR DE VENTA (RECIBO) */}
                    <div className="flex-1 p-10 flex flex-col overflow-hidden">
                        <div className="flex-1 border-4 border-dashed border-gray-100 rounded-[4rem] p-10 flex flex-col overflow-hidden">
                            
                            <div className="flex justify-between items-end mb-10 px-4">
                                <div>
                                    <h3 className="text-4xl font-black text-[#E94E4E] italic tracking-tighter uppercase">RECIBO</h3>
                                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Venta #{saleCount + 1}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Artículos</p>
                                    <p className="text-2xl font-black text-gray-800">{cartItems.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 font-black text-[10px] uppercase text-gray-400 border-b border-gray-100 pb-4 mb-2 px-4 tracking-[0.2em]">
                                <div className="col-span-5">Descripción</div>
                                <div className="col-span-2 text-center">Unidad</div>
                                <div className="col-span-2 text-center">Cant.</div>
                                <div className="col-span-3 text-right">Sub-total</div>
                            </div>

                            <ScrollArea className="flex-1 px-4">
                                {cartItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-200 py-32 opacity-40">
                                        <div className="w-20 h-20 border-4 border-dashed border-gray-200 rounded-full flex items-center justify-center mb-4">
                                            <Plus className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-lg uppercase tracking-widest">Esperando productos...</p>
                                    </div>
                                ) : (
                                    cartItems.map((item) => {
                                        const subtotalUSD = item.price * item.quantity;
                                        const subtotalBs = bcvRate ? subtotalUSD * bcvRate : 0;
                                        return (
                                            <div key={item.id} className="grid grid-cols-12 py-5 items-center border-b border-gray-50 group transition-all hover:translate-x-1">
                                                <div className="col-span-5">
                                                    <p className="font-black text-[#1A1C1E] text-sm uppercase leading-tight">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{formatUSD(item.price)} x {item.unit}</p>
                                                </div>
                                                <div className="col-span-2 text-center text-[10px] font-black text-gray-400 uppercase">
                                                    {item.unit}
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <span className="bg-gray-100 px-3 py-1 rounded-lg font-black text-[#107C41] text-sm">
                                                        {item.quantity}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 text-right flex items-center justify-end gap-3">
                                                    <div className="text-right">
                                                        <p className="font-black text-[#1A1C1E] text-base leading-none">{formatBs(subtotalBs)}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold">{formatUSD(subtotalUSD)}</p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleRemoveItem(item.id)} 
                                                        className="text-red-200 hover:text-red-500 hover:bg-red-50 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </ScrollArea>
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
        bcvRate={bcvRate}
    />
    </>
  )
}

/** * Subcomponentes para mantener la limpieza 
 */

function ProductListItem({ product, bcvRate, onAddProduct }: {
  product: Product; bcvRate: number | null; onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [value, setValue] = useState('1');
  const isByWeight = product.unit === 'kg' || product.unit === 'litro';
  
  return (
    <div className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-100 hover:border-[#107C41]/30 transition-all">
      <div className="flex-1">
        <p className="font-black text-[#1A1C1E] uppercase text-sm tracking-tight">{product.name}</p>
        <div className="flex gap-3 mt-1">
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-500 uppercase">{product.unit}</span>
            <span className="text-[10px] font-black text-[#107C41]">Stock: {product.stock}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Input 
            type="number" 
            className="w-20 h-11 text-center font-black rounded-xl bg-gray-50 border-none" 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
        />
        <Button 
            onClick={() => { onAddProduct(product, parseFloat(value)); setValue('1'); }} 
            className="h-11 px-6 rounded-xl font-black bg-[#107C41] hover:bg-[#0D6334]"
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
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-[3.5rem] border-none bg-[#F8F9F8]">
        <div className="p-10 pb-6 bg-white border-b border-gray-100">
          <DialogTitle className="text-3xl font-black mb-6 tracking-tight">Buscar Artículos</DialogTitle>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input 
                placeholder="Nombre del producto..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-14 h-14 rounded-2xl bg-[#F8F9F8] border-none text-lg font-bold" 
            />
          </div>
        </div>
        <ScrollArea className="flex-1 p-8">
          <div className="grid gap-4">
            {filtered.map(p => <ProductListItem key={p.id} product={p} bcvRate={bcvRate} onAddProduct={onAddProduct} />)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
