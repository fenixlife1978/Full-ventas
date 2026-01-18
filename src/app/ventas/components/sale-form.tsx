'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormField } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CalendarIcon, Plus, Trash2, DollarSign, CreditCard, Landmark, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useEffect, useMemo, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  saleDate: z.date(),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
})

export function SaleForm({ open, onOpenChange, onSubmit, products, bcvRate, saleCount }: any) {
  const [cartItems, setCartItems] = useState<any[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { saleDate: new Date(0), paymentMethod: 'cash' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        saleDate: new Date(),
        paymentMethod: 'cash',
      })
      setCartItems([])
    }
  }, [open, form])

  const totalUSD = useMemo(() => cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cartItems])
  const totalBs = useMemo(() => (bcvRate ? totalUSD * bcvRate : 0), [totalUSD, bcvRate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-none rounded-none bg-[#F3F4F6] flex flex-col overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Registro de Venta</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit({ ...v, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 }))} className="h-full flex flex-col">
            
            {/* BARRA SUPERIOR */}
            <header className="h-16 bg-white border-b border-gray-200 px-10 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-10">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Registro de Venta</h2>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-2">
                      {['cash', 'card', 'transfer', 'other'].map((m) => (
                        <Label key={m} className={cn(
                          "flex items-center px-4 py-2 rounded-xl border transition-all h-10 text-[10px] font-black cursor-pointer uppercase tracking-widest",
                          field.value === m ? "bg-[#107C41] border-[#107C41] text-white shadow-lg" : "border-gray-200 bg-white text-gray-400"
                        )}>
                          <RadioGroupItem value={m} className="sr-only" />
                          {m === 'cash' && <DollarSign className="mr-2 h-4 w-4" />}
                          {m === 'card' && <CreditCard className="mr-2 h-4 w-4" />}
                          {m === 'transfer' && <Landmark className="mr-2 h-4 w-4" />}
                          {m}
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>
              <Button type="button" onClick={() => onOpenChange(false)} variant="ghost" className="rounded-full h-10 w-10 p-0"><X className="h-6 w-6" /></Button>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* COLUMNA IZQUIERDA: CONTROLES */}
              <aside className="w-[460px] p-10 flex flex-col shrink-0 bg-white shadow-xl z-10">
                <div className="flex-1 space-y-10">
                  <h3 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">Nueva Venta</h3>
                  
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Fecha de Venta</Label>
                    <div className="flex items-center gap-4 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 font-bold text-gray-600">
                      <CalendarIcon className="h-5 w-5 text-[#107C41]" />
                      <span className="text-lg">{format(form.getValues('saleDate'), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>
                  </div>

                  <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full h-20 bg-gray-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all active:scale-95">
                    <Plus className="w-7 h-7 mr-3" /> AGREGAR PRODUCTOS
                  </Button>

                  <div className="bg-[#E7F3ED] p-10 rounded-[3.5rem] border border-[#107C41]/10 text-center shadow-inner">
                    <p className="text-[11px] uppercase font-black text-[#107C41] tracking-[0.3em] mb-4">Total a Pagar</p>
                    <p className="text-7xl font-black text-[#107C41] tracking-tighter leading-none mb-3">
                      Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(totalBs)}
                    </p>
                    <p className="text-2xl font-bold text-gray-400">USD {totalUSD.toFixed(2)}</p>
                  </div>
                </div>

                <Button type="submit" className="w-full h-24 text-2xl font-black rounded-[2.5rem] bg-[#107C41] hover:bg-[#0D6334] text-white shadow-2xl transition-all active:scale-95 uppercase tracking-widest mt-8">
                  Registrar Venta
                </Button>
              </aside>

              {/* COLUMNA DERECHA: MONITOR */}
              <main className="flex-1 p-10 flex flex-col overflow-hidden bg-[#F3F4F6]">
                <div className="flex-1 bg-white rounded-[4rem] shadow-sm flex flex-col overflow-hidden p-12 border border-gray-200/50">
                  <div className="text-center mb-12">
                    <h3 className="text-5xl font-black text-red-500 italic tracking-tighter uppercase">Monitor de Venta</h3>
                    <div className="h-1.5 w-32 bg-red-100 mx-auto mt-4 rounded-full" />
                    <p className="text-sm font-black text-gray-300 tracking-[0.4em] mt-4 uppercase">Venta Nº 00{saleCount + 1}</p>
                  </div>

                  <div className="grid grid-cols-12 font-black text-[11px] uppercase text-gray-300 border-b border-gray-100 pb-6 mb-4 px-8 tracking-[0.2em]">
                    <div className="col-span-5">Producto</div>
                    <div className="col-span-2 text-center">Unidad</div>
                    <div className="col-span-2 text-center">Cant.</div>
                    <div className="col-span-3 text-right">Sub-Total (Bs.)</div>
                  </div>

                  <ScrollArea className="flex-1 px-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 py-5 items-center bg-gray-50/50 mb-3 rounded-3xl border border-gray-100 px-6 group transition-all hover:bg-white hover:shadow-md">
                        <div className="col-span-5">
                          <p className="font-black text-gray-800 text-base uppercase leading-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">Ref: ${item.price.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-[11px] font-black text-gray-400 bg-white px-3 py-1 rounded-lg border uppercase">{item.unit}</span>
                        </div>
                        <div className="col-span-2 flex justify-center text-xl font-black text-[#107C41]">{item.quantity}</div>
                        <div className="col-span-3 text-right flex items-center justify-end gap-5">
                          <p className="font-black text-gray-800 text-xl tracking-tighter">
                            {(item.price * item.quantity * (bcvRate || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </p>
                          <Button variant="ghost" size="icon" onClick={() => setCartItems(prev => prev.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </main>
            </div>
          </form>
        </Form>
      </DialogContent>
      {/* Modal de selección omitido por brevedad, debe estar aquí abajo */}
    </Dialog>
  )
}
