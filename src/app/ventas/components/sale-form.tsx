'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray } from 'react-hook-form'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  Trash2,
  X,
  CreditCard,
  Landmark,
  DollarSign,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useEffect, useMemo, useState } from 'react'
import { type Product } from '@/app/productos/page'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const formSchema = z.object({
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
  saleDate: z.date(),
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
  ];

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saleDate: new Date(),
      paymentMethod: 'cash',
    },
  })

  useEffect(() => {
    if (open) {
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
        toast({ variant: 'destructive', title: 'Producto ya en el carrito' });
        return;
    }
    if (quantity > product.stock) {
        toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Solo hay ${product.stock} unidades de ${product.name}.` });
        return;
    }
    setCartItems(prev => [...prev, { ...product, quantity }]);
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };
  
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
        handleRemoveItem(productId);
        toast({ title: 'Producto Eliminado', description: 'La cantidad se estableció en 0.' });
        return;
    }

    if (newQuantity > product.stock) {
        toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Solo hay ${product.stock} unidades.` });
        setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: product.stock } : item));
        return;
    }

    setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
  };

  const handleFormSubmit = (values: SaleFormValues) => {
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Venta Vacía', description: 'Agrega productos para registrar la venta.' });
      return;
    }
    onSubmit({ ...values, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
  const formatUSD = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border-border">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
                <div className="flex-1 flex flex-row overflow-hidden">
                    {/* COLUMNA IZQUIERDA: CONTROLES */}
                    <div className="w-[380px] bg-muted/20 p-6 flex flex-col border-r border-border/50">
                        <DialogHeader className="mb-6 text-left">
                           <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tighter italic">NUEVA VENTA</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Método de Pago</FormLabel>
                                    <FormControl>
                                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-2">
                                          {paymentMethods.map(({ id, label, icon: Icon }) => (
                                              <div key={id}>
                                                  <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                                                  <Label
                                                      htmlFor={`pay-${id}`}
                                                      className={cn(
                                                          "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all h-16 text-xs font-bold cursor-pointer",
                                                          field.value === id ? "bg-primary/10 border-primary text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent"
                                                      )}
                                                  >
                                                      <Icon className="mb-1 h-5 w-5" /> {label}
                                                  </Label>
                                              </div>
                                          ))}
                                      </RadioGroup>
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            
                            <Button 
                                type="button" 
                                onClick={() => setIsProductSelectorOpen(true)} 
                                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold text-sm"
                            >
                                <Search className="w-4 h-4 mr-2" /> Agregar Productos
                            </Button>
                        </div>
                        
                        <div className="mt-auto pt-6 space-y-4">
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-center">
                                <p className="text-[9px] uppercase font-black text-primary/60 tracking-widest">Total a Pagar</p>
                                <p className="font-black text-3xl text-primary">{formatBs(totalBs)}</p>
                                <p className="text-sm font-medium text-muted-foreground">{formatUSD(totalUSD)}</p>
                            </div>
                            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl">
                                Registrar Venta
                            </Button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: MONITOR DE VENTA (RECIBO) */}
                    <div className="flex-1 p-6 flex flex-col overflow-hidden">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-destructive uppercase tracking-tighter italic">RECIBO #{saleCount + 1}</h3>
                             <p className="text-xs font-bold text-muted-foreground">{format(form.getValues('saleDate'), "d 'de' MMMM, yyyy", { locale: es })}</p>
                         </div>
                        
                        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[60%] text-xs">Producto</TableHead>
                                        <TableHead className="text-center text-xs">Cant.</TableHead>
                                        <TableHead className="text-right text-xs">Subtotal</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                            </Table>
                            <ScrollArea className="flex-1">
                                <Table>
                                     <TableBody>
                                        {cartItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center">
                                                    <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                                                    <p className="text-muted-foreground text-sm">Añade productos para empezar</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            cartItems.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <p className="font-bold text-sm uppercase">{item.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{formatUSD(item.price)} c/u</p>
                                                    </TableCell>
                                                    <TableCell className="w-24">
                                                        <Input
                                                          type="number"
                                                          value={item.quantity}
                                                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                                          min="1"
                                                          max={item.stock}
                                                          className="w-16 h-8 text-center rounded-md"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <p className="font-bold text-sm text-primary">{formatUSD(item.price * item.quantity)}</p>
                                                        {bcvRate && <p className="text-[10px] text-muted-foreground">{formatBs(item.price * item.quantity * bcvRate)}</p>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                         <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleRemoveItem(item.id)} 
                                                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
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
    />
    </>
  )
}

function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct }: {
  open: boolean; onOpenChange: (open: boolean) => void; products: Product[]; cartItems: CartItem[]; onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [quantity, setQuantity] = useState<{ [key: string]: number }>({})

  const availableProducts = useMemo(() => {
      const cartIds = new Set(cartItems.map(i => i.id));
      return products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          p.status === 'active' && 
          p.stock > 0 &&
          !cartIds.has(p.id)
      )
  }, [products, searchTerm, cartItems]);

  const handleAdd = (product: Product) => {
    const q = quantity[product.id] || 1;
    onAddProduct(product, q);
    setQuantity(prev => ({ ...prev, [product.id]: 1 }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Buscar y Agregar Productos</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nombre..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10" 
            />
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-2">
            {availableProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted">
                <div className="flex-1">
                  <p className="font-bold text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Stock: {product.stock} | Precio: ${product.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min="1" 
                    max={product.stock}
                    value={quantity[product.id] || 1} 
                    onChange={e => setQuantity(prev => ({...prev, [product.id]: parseInt(e.target.value) || 1}))}
                    className="w-16 h-9"
                  />
                  <Button size="sm" onClick={() => handleAdd(product)}>Agregar</Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
