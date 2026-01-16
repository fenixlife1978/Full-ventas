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
import { CalendarIcon, Plus, Search, Trash2, DollarSign, CreditCard, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useEffect, useMemo, useState } from 'react'
import { type Product } from '@/app/productos/page'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const formSchema = z.object({
  saleDate: z.date({
    required_error: 'La fecha de venta es requerida.',
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
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false)
  const [selectedPriceCheckerProductId, setSelectedPriceCheckerProductId] = useState<string | null>(null)
  
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

  const selectedPriceCheckerProduct = useMemo(() => {
      if (!selectedPriceCheckerProductId) return null;
      const product = products.find(p => p.id === selectedPriceCheckerProductId);
      return product ?? null;
  }, [selectedPriceCheckerProductId, products]);
  
  useEffect(() => {
    if(open) {
      form.reset({
          saleDate: new Date(),
          paymentMethod: 'cash',
      });
      setCartItems([]);
    }
  }, [open, form])

  const totalUSDInCents = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const subtotalCents = Math.round(item.price * (item.quantity || 0) * 100);
      return acc + subtotalCents;
    }, 0);
  }, [cartItems])
  
  const totalUSD = totalUSDInCents / 100;

  const totalBsInCents = useMemo(() => {
    if (!bcvRate) return 0;
    return Math.round(totalUSD * bcvRate * 100);
  }, [totalUSD, bcvRate])
  
  const totalBs = totalBsInCents / 100

  const handleAddProduct = (product: Product, quantity: number) => {
    if (quantity <= 0) {
      toast({ variant: 'destructive', title: 'Cantidad inválida' });
      return;
    }
    if (quantity > product.stock) {
      toast({ variant: 'destructive', title: `Stock insuficiente para ${product.name}` });
      return;
    }
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
        toast({ variant: 'destructive', title: 'Ya está en el recibo' });
        return;
    }
    setCartItems(prev => [...prev, { ...product, quantity }]);
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };
  
    const handleQuantityChange = (productId: string, newQuantity: number) => {
        const product = cartItems.find(item => item.id === productId);
        if (!product) return;

        if (isNaN(newQuantity)) {
          newQuantity = 0;
        }

        if (newQuantity > product.stock) {
            toast({
                variant: 'destructive',
                title: 'Stock insuficiente',
                description: `Solo quedan ${product.stock} ${product.unit || ''} de ${product.name}.`,
            });
            newQuantity = product.stock;
        }

        setCartItems(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, quantity: newQuantity < 0 ? 0 : newQuantity } : item
            )
        );
    };
    
    const handleQuantityBlur = (productId: string) => {
        const product = cartItems.find(item => item.id === productId);
        if (product && product.quantity <= 0) {
            handleRemoveItem(productId);
        }
    };


  const handleFormSubmit = (values: SaleFormValues) => {
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Venta Vacía', description: 'Agrega al menos un producto para registrar la venta.' });
      return;
    }
    onSubmit({ ...values, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 })
  }

  const formatBs = (value: number) => `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
  const formatUSD = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)

  const handlePriceCheckerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Previene el submit del formulario
    setIsPriceCheckerOpen(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[calc(100vh-4rem)] flex flex-col p-0">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex justify-between items-center gap-4">
                        <DialogTitle className="text-3xl font-black text-gray-800 tracking-tight">Nueva Venta</DialogTitle>
                        
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-4 gap-2"
                                >
                                    {paymentMethods.map(({ id, label, icon: Icon }) => (
                                    <FormItem key={id} className="flex items-center justify-center">
                                        <FormControl>
                                        <RadioGroupItem value={id} id={`pay-${id}`} className="sr-only" />
                                        </FormControl>
                                        <Label
                                        htmlFor={`pay-${id}`}
                                        className={cn(
                                            "flex items-center justify-center w-full px-3 py-2 rounded-lg border-2 cursor-pointer transition-all h-10 text-xs font-bold",
                                            field.value === id ? "bg-primary border-primary text-white" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-500"
                                        )}
                                        >
                                        <Icon className="mr-2 h-4 w-4" />
                                        <span>{label}</span>
                                        </Label>
                                    </FormItem>
                                    ))}
                                </RadioGroup>
                                </FormControl>
                                <FormMessage className="text-center" />
                            </FormItem>
                            )}
                        />

                        <div className="flex items-center gap-2">
                            <Button type="button" onClick={handlePriceCheckerClick} variant="outline" className="rounded-xl border-gray-200 whitespace-nowrap">
                                <DollarSign className="mr-2 h-4 w-4 text-primary" /> Consultar Precio
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-row overflow-hidden">
                     <div className="w-full lg:w-2/5 p-6 flex flex-col bg-white h-full">
                        <div className="flex flex-col flex-1 min-h-0">
                             <div className="pr-2 space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Fecha de Registro</Label>
                                <div className="w-full h-14 flex items-center justify-start font-bold rounded-xl border border-gray-100 bg-white px-4">
                                    <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                                    <span>{format(form.getValues('saleDate'), 'PPP', { locale: es })}</span>
                                </div>
                            </div>

                            <div className="flex-grow" />
                            
                            <div className="pt-6 space-y-4 bg-white">
                                <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full h-14 bg-black text-white hover:bg-black/80 rounded-2xl font-bold">
                                    <Plus className="w-5 h-5 mr-2" /> AGREGAR PRODUCTOS
                                </Button>
                                <div className="bg-primary/10 p-6 rounded-[2rem] border border-primary/20 text-center">
                                    <p className="text-[10px] uppercase font-black text-primary/70 tracking-[0.2em] mb-1">Total a Pagar</p>
                                    <p className="text-5xl font-black text-primary tracking-tight">{formatBs(totalBs)}</p>
                                    {bcvRate && <p className="text-md font-bold text-gray-500 mt-1">{formatUSD(totalUSD)}</p>}
                                </div>
                                <Button type="submit" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-transform">
                                    REGISTRAR VENTA
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="w-full lg:w-3/5 p-6 flex flex-col h-full overflow-hidden bg-gray-50/50">
                        <div className="flex-1 border-2 border-dashed border-gray-200 rounded-[3rem] p-10 bg-white shadow-inner flex flex-col overflow-hidden relative">
                            <div className="text-center mb-10">
                                <h3 className="text-3xl font-black text-red-600/80 italic tracking-tighter uppercase">Monitor de Venta</h3>
                                <div className="h-1 w-20 bg-red-100 mx-auto mt-2 rounded-full" />
                            </div>
                            <div className="grid grid-cols-12 font-black text-[10px] uppercase text-gray-400 border-b border-gray-100 pb-4 mb-2 px-2 tracking-widest">
                                <div className="col-span-6">Descripción</div>
                                <div className="col-span-2 text-center">Cant.</div>
                                <div className="col-span-3 text-right">Subtotal</div>
                                <div className="col-span-1" />
                            </div>
                            <ScrollArea className="flex-1 pr-4 -mr-4">
                                {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                                    <Search className="w-16 h-16 mb-4" />
                                    <p className="font-bold text-lg">Esperando artículos...</p>
                                </div>
                                ) : (
                                  cartItems.map((item: CartItem) => {
                                    const subtotalInCents = Math.round(item.price * (item.quantity || 0) * 100);
                                    const subtotalBsInCents = bcvRate ? Math.round(subtotalInCents * bcvRate) : 0;
                                    return (
                                        <div key={item.id} className="grid grid-cols-12 py-5 items-center border-b border-gray-50 group px-2 hover:bg-gray-50/50 rounded-xl transition-colors">
                                            <div className="col-span-6 pr-4">
                                                <p className="font-bold text-gray-800 text-sm uppercase leading-tight">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-1">{formatUSD(item.price)} / {item.unit || 'unidad'}</p>
                                            </div>
                                            <div className="col-span-2 flex justify-center items-center">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const isWeight = item.unit === 'kg' || item.unit === 'litro';
                                                        const value = e.target.value;
                                                        const newQuantity = value === '' ? 0 : (isWeight ? parseFloat(value) : parseInt(value, 10));
                                                        handleQuantityChange(item.id, newQuantity);
                                                    }}
                                                    onBlur={() => handleQuantityBlur(item.id)}
                                                    step={item.unit === 'kg' || item.unit === 'litro' ? '0.001' : '1'}
                                                    min="0"
                                                    className="w-24 text-center font-black text-primary text-lg bg-gray-100 border-gray-200 rounded-lg"
                                                />
                                            </div>
                                            <div className="col-span-3 text-right font-bold text-gray-800">
                                                {formatBs(subtotalBsInCents / 100)}
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })
                                )}
                            </ScrollArea>
                            <div className="mt-auto pt-8 border-t-2 border-double border-gray-100 flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-xs font-mono font-bold text-gray-400">Venta #{saleCount + 1}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono font-bold text-gray-400">{format(new Date(), 'Pp', { locale: es })}</p>
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
        onAddProduct={handleAddProduct}
        cartItems={cartItems}
        bcvRate={bcvRate}
    />
    
    <Dialog open={isPriceCheckerOpen} onOpenChange={setIsPriceCheckerOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8">
        <DialogHeader><DialogTitle className="text-2xl font-black text-center">Consultor de Precios</DialogTitle></DialogHeader>
        <div className="space-y-6 py-4">
            <Select onValueChange={setSelectedPriceCheckerProductId}>
            <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50 font-bold">
                <SelectValue placeholder="Busca un producto..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
                {products.map(p => (
                <SelectItem key={p.id} value={p.id} className="font-bold uppercase text-xs py-3 italic">
                    {p.name}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
            {selectedPriceCheckerProduct && (
            <Card className="bg-primary border-none rounded-[2rem] p-8 text-center shadow-xl shadow-primary/20">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-2">Precio Actualizado</p>
                 <p className="text-5xl font-black text-white">
                    {bcvRate ? formatBs(selectedPriceCheckerProduct.price * bcvRate) : formatUSD(selectedPriceCheckerProduct.price)}
                </p>
                {bcvRate && (
                    <p className="text-xl font-bold text-white/80 mt-2">
                        {formatUSD(selectedPriceCheckerProduct.price)}
                    </p>
                )}
            </Card>
            )}
        </div>
        </DialogContent>
    </Dialog>
    </>
  )
}


function ProductListItem({
  product,
  bcvRate,
  onAddProduct,
}: {
  product: Product;
  bcvRate: number | null;
  onAddProduct: (product: Product, quantity: number) => void;
}) {
  const [bsValue, setBsValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [unitValue, setUnitValue] = useState('1');
  const { toast } = useToast();

  const isByWeightOrVolume = product.unit === 'kg' || product.unit === 'litro';

  const pricePerUnitInCents = Math.round((product.price || 0) * 100);
  const pricePerUnitBsInCents = Math.round(pricePerUnitInCents * (bcvRate || 0));

  const handleBsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBsValue(value);
    if (value === '') {
      setWeightValue('');
      return;
    }
    const bsInCents = Math.round(parseFloat(value) * 100);
    if (!isNaN(bsInCents) && pricePerUnitBsInCents > 0) {
      const calculatedWeight = (bsInCents / pricePerUnitBsInCents);
      setWeightValue(calculatedWeight.toFixed(3));
    }
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWeightValue(value);
    if (value === '') {
      setBsValue('');
      return;
    }
    const weight = parseFloat(value);
    if (!isNaN(weight) && pricePerUnitBsInCents > 0) {
      const calculatedBsInCents = Math.round(weight * pricePerUnitBsInCents);
      setBsValue((calculatedBsInCents / 100).toFixed(2));
    }
  };
  
  const handleAdd = () => {
    const quantity = isByWeightOrVolume ? parseFloat(weightValue) : parseInt(unitValue, 10);
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Cantidad inválida',
        description: 'Por favor, introduce una cantidad o monto válido.',
      });
      return;
    }
    
    if (quantity > product.stock) {
      toast({
        variant: 'destructive',
        title: 'Stock insuficiente',
        description: `Solo quedan ${product.stock} ${product.unit} de ${product.name}.`,
      });
      return;
    }
    
    onAddProduct(product, quantity);
    // Reset fields after adding
    if (isByWeightOrVolume) {
      setBsValue('');
      setWeightValue('');
    } else {
      setUnitValue('1');
    }
  };
  
  return (
    <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 hover:shadow-md transition-all group">
      <div>
        <p className="font-black text-gray-800 uppercase text-sm tracking-tight">{product.name}</p>
        <p className="text-xs text-primary font-black mt-1">
          Disponible: {product.stock} {product.unit}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {isByWeightOrVolume && bcvRate ? (
          <>
            <div className="flex flex-col items-start">
              <Label className="text-[10px] font-black text-gray-400 mb-1 uppercase px-1">Bs.</Label>
              <Input
                type="number"
                placeholder="0.00"
                className="w-28 h-12 text-center font-black rounded-xl border-gray-100 bg-gray-50"
                value={bsValue}
                onChange={handleBsChange}
              />
            </div>
            <div className="flex flex-col items-start">
              <Label className="text-[10px] font-black text-gray-400 mb-1 uppercase px-1">
                Peso ({product.unit})
              </Label>
              <Input
                type="number"
                placeholder="0.000"
                className="w-28 h-12 text-center font-black rounded-xl border-gray-100 bg-gray-50"
                value={weightValue}
                onChange={handleWeightChange}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <Label className="text-[10px] font-black text-gray-300 mb-1 uppercase">Cant.</Label>
            <Input
              type="number"
              min="1"
              max={product.stock}
              className="w-20 h-12 text-center font-black rounded-xl border-gray-100 bg-gray-50"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
            />
          </div>
        )}
        <Button onClick={handleAdd} className="self-end rounded-xl h-12 px-6 font-black shadow-lg shadow-primary/10">
          AÑADIR
        </Button>
      </div>
    </div>
  );
}


function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct, bcvRate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  cartItems: CartItem[];
  onAddProduct: (product: Product, quantity: number) => void;
  bcvRate: number | null;
}) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const cartIds = new Set(cartItems.map(i => i.id))
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !cartIds.has(p.id) && 
    p.stock > 0 &&
    p.status === 'active'
  )

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl">
        <div className="p-10 border-b border-gray-50 bg-white">
          <DialogTitle className="text-3xl font-black mb-6 tracking-tight">Inventario de Tienda</DialogTitle>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input 
              placeholder="Buscar producto por nombre..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-12 h-14 rounded-2xl bg-gray-50 border-none text-lg font-medium placeholder:text-gray-300" 
            />
          </div>
        </div>
        <ScrollArea className="flex-1 p-10 bg-gray-50/30">
          <div className="grid grid-cols-1 gap-4">
            {filtered.length === 0 ? (
              <p className="text-center py-20 text-gray-400 font-bold italic">No se encontraron productos disponibles...</p>
            ) : (
              filtered.map(p => (
                <ProductListItem 
                  key={p.id}
                  product={p}
                  bcvRate={bcvRate}
                  onAddProduct={onAddProduct}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
