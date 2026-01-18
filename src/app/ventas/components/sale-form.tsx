'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  DollarSign,
  CreditCard,
  Landmark,
  Search,
  ShoppingCart,
  Info,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

// Esquema de validación
const formSchema = z.object({
  saleDate: z.date(),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
})

// --- Sub-componentes ---

const ProductListItem = ({ product, onSelect, formatCurrency }: any) => (
  <div
    className="flex items-center justify-between p-3 hover:bg-black/10 rounded-lg cursor-pointer transition-colors"
    onClick={() => onSelect(product)}
  >
    <div>
      <p className="font-bold">{product.name}</p>
      <p className="text-sm text-muted-foreground">Stock: {product.stock} {product.unit}</p>
    </div>
    <div className="text-right">
       <p className="font-bold text-primary">{formatCurrency(product.price, 'VES')}</p>
       <p className="text-sm text-muted-foreground">{formatCurrency(product.price, 'USD')}</p>
    </div>
  </div>
);

const ProductSelectorModal = ({ isOpen, onClose, products, onSelectProduct, formatCurrency }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setQuantity('1');
            setSelectedProduct(null);
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        return products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, products]);

    const handleAdd = () => {
        if (selectedProduct) {
            const numQuantity = parseFloat(quantity);
            if (!isNaN(numQuantity) && numQuantity > 0) {
                onSelectProduct(selectedProduct, numQuantity);
                onClose();
            }
        }
    };
    
    const isWeightBased = selectedProduct && (selectedProduct.unit === 'kg' || selectedProduct.unit === 'litro');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Buscar Artículos</DialogTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </DialogHeader>
                <ScrollArea className="h-72 mt-2 border rounded-md p-2">
                    {filteredProducts.map((p: any) => (
                         <ProductListItem
                            key={p.id}
                            product={p}
                            onSelect={setSelectedProduct}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </ScrollArea>
                {selectedProduct && (
                    <DialogFooter className="!justify-between items-center gap-4 bg-muted/50 p-4 rounded-lg mt-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase font-bold">Seleccionado</span>
                          <p className="font-bold text-lg leading-tight">{selectedProduct.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-start">
                               <Label htmlFor="quantity-input" className="text-[10px] mb-1 font-black uppercase text-primary">
                                 {isWeightBased ? `Peso (${selectedProduct.unit})` : 'Cantidad'}
                               </Label>
                               <Input
                                  id="quantity-input"
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  className="w-24 text-center h-9 font-bold"
                                  step={isWeightBased ? "0.01" : "1"}
                                  min={isWeightBased ? "0.01" : "1"}
                               />
                            </div>
                            <Button onClick={handleAdd} className="self-end h-9">
                              <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

const PriceListModal = ({ isOpen, onClose, products, formatCurrency }: any) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        return products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, products]);

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Lista de Precios</DialogTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </DialogHeader>
                <ScrollArea className="h-[60vh] border rounded-md mt-4">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card shadow-sm">
                            <tr className="border-b">
                                <th className="p-3 text-left font-bold">Producto</th>
                                <th className="p-3 text-right font-bold">Precio Bs.</th>
                                <th className="p-3 text-right font-bold">Precio USD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p: any) => (
                                <tr key={p.id} className="border-b hover:bg-black/10">
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3 text-right font-bold text-primary">{formatCurrency(p.price, 'VES')}</td>
                                    <td className="p-3 text-right text-muted-foreground">{formatCurrency(p.price, 'USD')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

// --- Componente Principal ---

export function SaleForm({ open, onOpenChange, onSubmit, products = [], bcvRate, saleCount = 0 }: any) {
  const [cartItems, setCartItems] = useState<any[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const [isPriceListOpen, setIsPriceListOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { saleDate: new Date(), paymentMethod: 'cash' },
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
  
  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES') {
      const converted = bcvRate ? value * bcvRate : 0;
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted)}`
    }
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const handleSelectProduct = (product: any, quantity: number) => {
    const existingItem = cartItems.find(item => item.id === product.id)
    const currentQtyInCart = existingItem ? existingItem.quantity : 0
    const newQuantity = currentQtyInCart + quantity

    if (newQuantity > product.stock) {
      toast({ 
        variant: "destructive",
        title: "Stock insuficiente", 
        description: `Solo quedan ${product.stock} unidades de ${product.name}.` 
      })
      return
    }

    if (existingItem) {
      setCartItems(cartItems.map(item => item.id === product.id ? { ...item, quantity: newQuantity } : item))
    } else {
      setCartItems([...cartItems, { ...product, quantity, productId: product.id, unitPrice: product.price }])
    }
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock) {
      toast({
        variant: "destructive",
        title: "Stock insuficiente",
        description: `La cantidad máxima para ${product.name} es ${product.stock}.`
      });
      setCartItems(cartItems.map(item => item.id === productId ? { ...item, quantity: product.stock } : item));
      return;
    }
    
    if (newQuantity <= 0) {
      setCartItems(cartItems.filter(item => item.id !== productId));
    } else {
      setCartItems(cartItems.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] flex p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Registro de Venta</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((v) => onSubmit({ ...v, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 }))} 
            className="flex flex-1 overflow-hidden"
          >
            {/* Lado Izquierdo: Configuración y Totales */}
            <div className="w-1/2 flex flex-col bg-card p-6 border-r border-border">
                <div className="mb-6">
                  <h2 className="text-3xl font-black italic tracking-tighter text-primary uppercase">Nueva Venta</h2>
                  <p className="text-sm text-muted-foreground">ID de Transacción: #{String(saleCount + 1).padStart(5, '0')}</p>
                </div>
                
                <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Método de Pago</FormLabel>
                              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-3 mt-2">
                                  {['cash', 'card', 'transfer'].map((method) => (
                                    <FormItem key={method} className="flex-1">
                                        <FormControl>
                                          <RadioGroupItem value={method} id={method} className="sr-only" />
                                        </FormControl>
                                        <Label htmlFor={method} className={cn(
                                          "flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground",
                                          field.value === method && "border-primary bg-primary/10 text-primary"
                                        )}>
                                            {method === 'cash' && <DollarSign className="mb-2 h-6 w-6" />}
                                            {method === 'card' && <CreditCard className="mb-2 h-6 w-6" />}
                                            {method === 'transfer' && <Landmark className="mb-2 h-6 w-6" />}
                                            <span className="text-xs font-bold uppercase">{method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'Transf.'}</span>
                                        </Label>
                                    </FormItem>
                                  ))}
                              </RadioGroup>
                          </FormItem>
                      )}
                    />

                    <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full h-14 text-lg font-bold rounded-xl shadow-lg">
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Añadir Productos
                    </Button>
                </div>
              
              <div className="mt-auto space-y-4">
                 <div className="p-5 bg-primary/10 rounded-2xl border border-primary/20">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-primary uppercase">Total a Pagar</span>
                        <span className="text-3xl font-black text-primary">{formatCurrency(totalUSD, 'VES')}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 border-t border-primary/10 pt-1">
                        <span className="text-xs font-medium text-muted-foreground italic">Referencia USD</span>
                        <span className="text-md font-bold text-muted-foreground">{formatCurrency(totalUSD, 'USD')}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <Button type="button" onClick={() => setIsPriceListOpen(true)} variant="outline" className="font-bold">
                        <Info className="mr-2 h-4 w-4" /> Precios
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase italic tracking-tighter" 
                      disabled={cartItems.length === 0}
                    >
                      Facturar
                    </Button>
                 </div>
              </div>
            </div>

            {/* Lado Derecho: Recibo */}
            <div className="w-1/2 flex flex-col bg-background p-6">
                <div className="mb-4 flex justify-center items-end border-b-2 border-dashed border-border/50 pb-2">
                    <h2 className="text-xl font-black text-destructive uppercase tracking-widest">Recibo</h2>
                </div>
                <ScrollArea className="flex-1 -mx-2 pr-2">
                    <div className="space-y-3">
                        {cartItems.length === 0 ? (
                            <div className="text-center text-muted-foreground py-20 flex flex-col items-center">
                                <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm italic">El carrito está vacío</p>
                            </div>
                        ) : (
                            cartItems.map(item => {
                                const isItemWeightBased = item.unit === 'kg' || item.unit === 'litro';
                                return (
                                    <div key={item.id} className="flex items-center bg-card p-3 rounded-xl shadow-sm border border-border/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate text-sm">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{formatCurrency(item.price, 'VES')} / {item.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                           <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                                                className="w-16 h-8 text-center text-xs font-bold p-1"
                                                min="0"
                                                step={isItemWeightBased ? "0.01" : "1"}
                                            />
                                            <div className="w-24 text-right">
                                                <p className="font-bold text-sm">{formatCurrency(item.price * item.quantity, 'VES')}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleUpdateQuantity(item.id, 0)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
                
                {cartItems.length > 0 && bcvRate && (
                    <div className="mt-4 pt-4 border-t border-dashed border-border/50 flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase">
                        <span>Tasa Oficial BCV</span>
                        <span>{bcvRate.toFixed(2)} Bs./USD</span>
                    </div>
                )}
            </div>
          </form>
        </Form>
      </DialogContent>

      <ProductSelectorModal
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        products={products}
        onSelectProduct={handleSelectProduct}
        formatCurrency={formatCurrency}
      />
      <PriceListModal
        isOpen={isPriceListOpen}
        onClose={() => setIsPriceListOpen(false)}
        products={products}
        formatCurrency={formatCurrency}
      />
    </Dialog>
  );
}
