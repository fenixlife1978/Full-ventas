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
  CalendarIcon,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
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
    { id: 'cash', label: 'Efectivo' },
    { id: 'card', label: 'Tarjeta' },
    { id: 'transfer', label: 'Transferencia' },
    { id: 'other', label: 'Otro' },
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
        toast({ variant: 'destructive', title: 'El producto ya está en el monitor.' });
        return;
    }
    const newQuantity = isNaN(quantity) ? 1 : quantity;

    if (newQuantity > product.stock) {
        toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Solo quedan ${product.stock} unidades de ${product.name}.` });
        return;
    }

    setCartItems(prev => [...prev, { ...product, quantity: newQuantity }]);
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

  const formatBs = (value: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const formatUSD = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full p-0 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl overflow-hidden">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid grid-cols-12 h-[700px]">
                
                {/* Left Panel */}
                <div className="col-span-5 bg-white dark:bg-black/20 p-8 flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">NUEVA VENTA</h2>

                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                            <FormItem>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-1 bg-gray-100 dark:bg-black/30 p-1 rounded-lg">
                                    {paymentMethods.map(({ id, label }) => (
                                        <div key={id} className="flex-1">
                                            <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                                            <Label
                                                htmlFor={`pay-${id}`}
                                                className={cn(
                                                    "block w-full text-center p-2 rounded-md text-sm font-semibold cursor-pointer transition-colors",
                                                    field.value === id ? "bg-green-500 text-white shadow" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-black/40"
                                                )}
                                            >
                                                {label}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="saleDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400">FECHA DE VENTA</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-full pl-3 text-left font-semibold border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-black/30',
                                            !field.value && 'text-muted-foreground'
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, 'dd/MM/yyyy')
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
                                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                        initialFocus
                                        locale={es}
                                    />
                                    </PopoverContent>
                                </Popover>
                                </FormItem>
                            )}
                        />

                        <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full bg-black dark:bg-gray-800 text-white font-bold text-base py-6 rounded-lg hover:bg-black/80 dark:hover:bg-gray-700">
                            <Plus className="mr-2"/> AGREGAR PRODUCTOS
                        </Button>

                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400">OBSERVACIONES</FormLabel>
                                <Textarea
                                    placeholder="Añade notas adicionales..."
                                    className="resize-none bg-gray-100 dark:bg-black/30 border-gray-200 dark:border-gray-700"
                                    {...field}
                                />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <div className="mt-auto space-y-4">
                        <div className="bg-green-500 text-white p-6 rounded-lg text-center">
                            <p className="text-4xl font-bold">Bs. {formatBs(totalBs)}</p>
                            <p className="font-semibold opacity-80">{formatUSD(totalUSD)}</p>
                        </div>
                         <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-lg text-lg">
                            REGISTRAR VENTA
                        </Button>
                    </div>

                </div>

                {/* Right Panel */}
                <div className="col-span-7 p-8 flex flex-col">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-red-500">MONITOR DE VENTA</h2>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">VENTA Nº {saleCount + 1}</p>
                    </div>

                    <div className="grid grid-cols-12 gap-4 px-4 pb-2 border-b-2 border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                        <div className="col-span-5">Producto</div>
                        <div className="col-span-2 text-center">Unidad</div>
                        <div className="col-span-2 text-center">Cant.</div>
                        <div className="col-span-2 text-right">Monto</div>
                        <div className="col-span-1"></div>
                    </div>
                    
                    <ScrollArea className="flex-1 -mx-4">
                        <div className="px-4">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <p>No hay productos en el monitor</p>
                            </div>
                        ) : (
                            cartItems.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 py-4 items-center border-b border-gray-100 dark:border-gray-800">
                                    <div className="col-span-5 font-semibold text-gray-800 dark:text-gray-200">{item.name}</div>
                                    <div className="col-span-2 text-center text-gray-600 dark:text-gray-400 text-sm">{item.unit || 'unidad'}</div>
                                    <div className="col-span-2 text-center font-bold text-gray-800 dark:text-gray-200">{item.quantity}</div>
                                    <div className="col-span-2 text-right font-bold text-gray-800 dark:text-gray-200">{formatUSD(item.price * item.quantity)}</div>
                                    <div className="col-span-1 text-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                        </div>
                    </ScrollArea>
                    
                    <div className="pt-4 mt-auto border-t-2 border-gray-200 dark:border-gray-700 flex justify-between items-center text-gray-700 dark:text-gray-300">
                        <p className="font-bold">TOTAL VENTA</p>
                        <div className="text-right">
                           <p className="text-lg font-bold">Bs. {formatBs(totalBs)}</p>
                           <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{formatUSD(totalUSD)}</p>
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

function ProductListItem({ product, onAddProduct, onSelect }: {
  product: Product; onAddProduct: (product: Product, quantity: number) => void; onSelect: () => void;
}) {
  const [quantity, setQuantity] = useState('1');

  const handleAdd = () => {
      const numQuantity = parseFloat(quantity);
      if (!isNaN(numQuantity) && numQuantity > 0) {
          onAddProduct(product, numQuantity);
          onSelect();
      }
  }
  
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-700">
      <div>
        <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Stock: {product.stock} {product.unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input 
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 h-10 text-center font-bold bg-gray-100 dark:bg-black/30 border-gray-200 dark:border-gray-700 rounded-md"
        />
        <Button onClick={handleAdd} className="bg-green-500 hover:bg-green-600 text-white font-bold h-10">Añadir</Button>
      </div>
    </div>
  );
}

function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct }: {
  open: boolean; onOpenChange: (open: boolean) => void; products: Product[]; cartItems: CartItem[]; onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const cartIds = new Set(cartItems.map(i => i.id))
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !cartIds.has(p.id) && p.status === 'active' && p.stock > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900 border-none">
        <DialogHeader className="p-6 bg-white dark:bg-black/20 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Seleccionar Producto</DialogTitle>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                    placeholder="Buscar producto..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-11 rounded-lg bg-gray-100 dark:bg-black/30 border-gray-200 dark:border-gray-700" 
                />
            </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="grid gap-3">
            {filteredProducts.map(p => 
                <ProductListItem key={p.id} product={p} onAddProduct={onAddProduct} onSelect={() => onOpenChange(false)} />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
