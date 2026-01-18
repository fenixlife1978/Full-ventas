'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { CalendarIcon, Plus, Search, Trash2, DollarSign, CreditCard, Landmark, X, ReceiptText } from 'lucide-react'
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
  saleDate: z.date({ required_error: 'La fecha es requerida.' }),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
})

export type SaleFormValues = z.infer<typeof formSchema>
export interface CartItem extends Product { quantity: number }

interface SaleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SaleFormValues & { items: CartItem[], totalAmount: number, saleNumber: number }) => void
  products: Product[]
  isLoadingProducts: boolean // Añadido para resolver el error de TS
  bcvRate: number | null
  saleCount: number
}

export function SaleForm({ open, onOpenChange, onSubmit, products, bcvRate, saleCount, isLoadingProducts }: SaleFormProps) {
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
    defaultValues: { saleDate: new Date(), paymentMethod: 'cash' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ saleDate: new Date(), paymentMethod: 'cash' });
      setCartItems([]);
    }
  }, [open, form])

  const totalUSD = useMemo(() => cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 0)), 0), [cartItems])
  const totalBs = useMemo(() => (bcvRate ? totalUSD * bcvRate : 0), [totalUSD, bcvRate])

  const handleAddProduct = (product: Product, quantity: number) => {
    if (cartItems.find(item => item.id === product.id)) {
      toast({ variant: 'destructive', title: 'Ya está en el monitor' });
      return;
    }
    setCartItems(prev => [...prev, { ...product, quantity }]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-none rounded-none bg-[#F3F4F6] flex flex-col overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit({ ...v, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 }))} className="h-full flex flex-col">
            
            {/* BARRA SUPERIOR ESTATICA */}
            <div className="h-16 bg-white border-b border-gray-200 px-10 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                  <div className="bg-[#107C41] p-2 rounded-lg"><ReceiptText className="text-white h-5 w-5" /></div>
                  <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Sistema de Ventas</h2>
                </div>
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-2">
                      {paymentMethods.map(({ id, label, icon: Icon }) => (
                        <Label key={id} htmlFor={`pay-${id}`} className={cn(
                          "flex items-center px-4 py-2 rounded-xl border transition-all h-10 text-[10px] font-black cursor-pointer uppercase tracking-widest",
                          field.value === id ? "bg-[#107C41] border-[#107C41] text-white shadow-lg shadow-[#107C41]/30" : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                        )}>
                          <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                          <Icon className="mr-2 h-4 w-4" /> {label}
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>
              <Button type="button" onClick={() => onOpenChange(false)} variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-red-50 hover:text-red-500 transition-colors">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* CUERPO DE DOS COLUMNAS */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* COLUMNA IZQUIERDA: NUEVA VENTA */}
              <aside className="w-[460px] p-10 flex flex-col shrink-0 bg-white shadow-[15px_0_30px_-15px_rgba(0,0,0,0.05)] z-10">
                <div className="flex-1 space-y-10">
                  <h3 className="text-3xl font-black text-gray-800 tracking-tighter">NUEVA VENTA</h3>
                  
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Fecha de Venta</Label>
                    <div className="flex items-center gap-4 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 font-bold text-gray-600">
                      <CalendarIcon className="h-5 w-5 text-[#107C41]" />
                      <span className="text-lg">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>
                  </div>

                  <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full h-20 bg-gray-900 text-white hover:bg-black rounded-[2rem] font-black text-xl shadow-xl transition-transform active:scale-95">
                    <Plus className="w-7 h-7 mr-3" /> {isLoadingProducts ? 'CARGANDO...' : 'AGREGAR PRODUCTOS'}
                  </Button>

                  {/* CAJA DE TOTAL VERDE */}
                  <div className="bg-[#E7F3ED] p-10 rounded-[3.5rem] border border-[#107C41]/10 text-center shadow-inner">
                    <p className="text-[11px] uppercase font-black text-[#107C41] tracking-[0.3em] mb-4">Total a Pagar</p>
                    <p className="text-7xl font-black text-[#107C41] tracking-tighter leading-none mb-3">
                      Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(totalBs)}
                    </p>
                    <p className="text-2xl font-bold text-gray-400">USD {totalUSD.toFixed(2)}</p>
                  </div>
                </div>

                <Button type="submit" className="w-full h-24 text-2xl font-black rounded-[2.5rem] bg-[#107C41] hover:bg-[#0D6334] text-white shadow-2xl shadow-[#107C41]/30 transition-all active:scale-95 uppercase tracking-widest mt-8">
                  Registrar Venta
                </Button>
              </aside>

              {/* COLUMNA DERECHA: MONITOR (LISTADO) */}
              <main className="flex-1 p-10 flex flex-col overflow-hidden bg-[#F3F4F6]">
                <div className="flex-1 bg-white rounded-[4rem] shadow-sm flex flex-col overflow-hidden p-12 border border-gray-200/50">
                  <div className="text-center mb-12">
                    <h3 className="text-5xl font-black text-red-500 italic tracking-tighter uppercase opacity-90">Monitor de Venta</h3>
                    <div className="h-1.5 w-32 bg-red-100 mx-auto mt-4 rounded-full" />
                    <p className="text-sm font-black text-gray-300 tracking-[0.4em] mt-4">VENTA Nº 00{saleCount + 1}</p>
                  </div>

                  <div className="grid grid-cols-12 font-black text-[11px] uppercase text-gray-300 border-b border-gray-100 pb-6 mb-4 px-8 tracking-[0.2em]">
                    <div className="col-span-5">Producto</div>
                    <div className="col-span-2 text-center">Unidad</div>
                    <div className="col-span-2 text-center">Cant.</div>
                    <div className="col-span-3 text-right">Sub-Total (Bs.)</div>
                  </div>

                  <ScrollArea className="flex-1 px-4">
                    {cartItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-200 py-32 opacity-40 italic">
                        <ReceiptText className="w-20 h-20 mb-4" />
                        <p className="text-xl font-black uppercase tracking-widest">Esperando Artículos...</p>
                      </div>
                    ) : (
                      cartItems.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 py-5 items-center bg-gray-50/50 mb-3 rounded-3xl border border-gray-100/50 px-6 group transition-all hover:bg-white hover:shadow-md">
                          <div className="col-span-5">
                            <p className="font-black text-gray-800 text-base uppercase leading-tight">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">Precio Ref: ${item.price.toFixed(2)}</p>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-[11px] font-black text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-lg uppercase">{item.unit || 'UND'}</span>
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <span className="text-xl font-black text-[#107C41]">{item.quantity}</span>
                          </div>
                          <div className="col-span-3 text-right flex items-center justify-end gap-5">
                            <p className="font-black text-gray-800 text-xl tracking-tighter">
                              {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(item.price * item.quantity * (bcvRate || 0))}
                            </p>
                            <Button variant="ghost" size="icon" onClick={() => setCartItems(prev => prev.filter(i => i.id !== item.id))} className="h-10 w-10 text-gray-300 hover:text-red-500 rounded-full transition-colors">
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>

                  <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-100 flex justify-between items-center px-8 text-gray-400 font-bold">
                    <p className="text-sm uppercase tracking-widest">Resumen de Venta</p>
                    <p className="text-lg">Tasa del día: <span className="text-[#107C41] font-black">Bs. {bcvRate?.toFixed(2)}</span></p>
                  </div>
                </div>
              </main>
            </div>
          </form>
        </Form>
      </DialogContent>

      <ProductSelectorModal 
        open={isProductSelectorOpen} 
        onOpenChange={setIsProductSelectorOpen} 
        products={products} 
        onAddProduct={handleAddProduct} 
        bcvRate={bcvRate} 
      />
    </Dialog>
  )
}

function ProductSelectorModal({ open, onOpenChange, products, onAddProduct, bcvRate }: any) {
  const [searchTerm, setSearchTerm] = useState('')
  const filtered = products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.status === 'active')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-10 rounded-[3.5rem] border-none shadow-2xl">
        <DialogTitle className="text-3xl font-black mb-6 tracking-tight">Seleccionar Producto</DialogTitle>
        <div className="relative mb-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 h-6 w-6" />
          <Input 
            className="pl-14 h-16 rounded-2xl bg-gray-50 border-none text-xl font-bold" 
            placeholder="Escribe el nombre del producto..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="grid gap-4 pr-4">
            {filtered.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem] border border-transparent hover:border-[#107C41]/30 transition-all group">
                <div>
                  <p className="font-black uppercase text-base text-gray-800">{p.name}</p>
                  <p className="text-sm font-bold text-[#107C41]">Precio: Bs. {(p.price * (bcvRate || 0)).toFixed(2)}</p>
                </div>
                <Button 
                  onClick={() => { onAddProduct(p, 1); onOpenChange(false); }} 
                  className="bg-[#107C41] hover:bg-[#0D6334] h-12 px-8 font-black rounded-xl text-white transition-all active:scale-95"
                >
                  AÑADIR AL MONITOR
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
