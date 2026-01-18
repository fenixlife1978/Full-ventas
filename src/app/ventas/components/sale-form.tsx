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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  CalendarIcon,
  Plus,
  Trash2,
  DollarSign,
  CreditCard,
  Landmark,
  X,
  Search,
  ShoppingCart,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { useEffect, useMemo, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  saleDate: z.date(),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
})

const ProductListItem = ({ product, onSelect, bcvRate, formatCurrency }: any) => (
  <div
    key={product.id}
    className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
    onClick={() => onSelect(product)}
  >
    <div>
      <p className="font-bold">{product.name}</p>
      <p className="text-sm text-gray-500">Stock: {product.stock}</p>
    </div>
    <div className="text-right">
       <p className="font-bold">{formatCurrency(product.price, 'VES')}</p>
       <p className="text-sm text-gray-500">{formatCurrency(product.price, 'USD')}</p>
    </div>
  </div>
);

const ProductSelectorModal = ({ isOpen, onClose, products, onSelectProduct, bcvRate, formatCurrency }: any) => {
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </DialogHeader>
                <ScrollArea className="h-72">
                    {filteredProducts.map((p: any) => (
                         <ProductListItem
                            key={p.id}
                            product={p}
                            onSelect={setSelectedProduct}
                            bcvRate={bcvRate}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </ScrollArea>
                {selectedProduct && (
                    <DialogFooter className="!justify-between items-center gap-2 bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-lg">{selectedProduct.name}</p>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-start">
                               <Label htmlFor="quantity-input" className="text-xs mb-1 font-semibold">{isWeightBased ? `Peso (${selectedProduct.unit})` : 'Cantidad'}</Label>
                               <Input
                                  id="quantity-input"
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  className="w-24 text-center h-9"
                                  step={isWeightBased ? "0.01" : "1"}
                                  min={isWeightBased ? "0.01" : "1"}
                               />
                            </div>
                            <Button onClick={handleAdd} className="self-end">Agregar</Button>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};
  
const PriceListModal = ({ isOpen, onClose, products, bcvRate, formatCurrency }: any) => {
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </DialogHeader>
                <ScrollArea className="h-[60vh]">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Producto</th>
                                <th className="p-2 text-right">Precio Bs.</th>
                                <th className="p-2 text-right">Precio USD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p: any) => (
                                <tr key={p.id} className="border-b">
                                    <td className="p-2 font-medium">{p.name}</td>
                                    <td className="p-2 text-right font-semibold">{formatCurrency(p.price, 'VES')}</td>
                                    <td className="p-2 text-right">{formatCurrency(p.price, 'USD')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export function SaleForm({ open, onOpenChange, onSubmit, products, bcvRate, saleCount }: any) {
  const [cartItems, setCartItems] = useState<any[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const [isPriceListOpen, setIsPriceListOpen] = useState(false)
  const { toast } = useToast()

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
  
  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES') {
      if (bcvRate) {
        value = value * bcvRate
        return `Bs. ${new Intl.NumberFormat('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)}`
      }
      return 'Bs. --,--'
    }
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const handleSelectProduct = (product: any, quantity: number) => {
    if (!product || quantity <= 0) return

    const existingItem = cartItems.find(item => item.id === product.id)
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
       if (newQuantity > product.stock) {
        toast({ title: "Stock insuficiente", description: `Solo quedan ${product.stock} unidades de ${product.name}.` })
        return;
      }
      setCartItems(cartItems.map(item => item.id === product.id ? { ...item, quantity: newQuantity } : item))
    } else {
        if (quantity > product.stock) {
            toast({ title: "Stock insuficiente", description: `Solo quedan ${product.stock} unidades de ${product.name}.` })
            return;
        }
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
       toast({
        title: "Producto eliminado",
        description: `${product.name} fue eliminado del recibo.`,
      });
      setCartItems(cartItems.filter(item => item.id !== productId));
    } else {
      setCartItems(cartItems.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] flex p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Registro de Venta</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit({ ...v, items: cartItems, totalAmount: totalUSD, saleNumber: saleCount + 1 }))} className="flex flex-1">
            
            <div className="w-1/2 flex flex-col bg-white p-6 border-r">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">NUEVA VENTA</h2>
                </div>
                
                <div className="space-y-4">
                   <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Método de Pago</FormLabel>
                              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-2">
                                  <FormItem className="flex-1">
                                      <FormControl>
                                        <RadioGroupItem value="cash" id="cash" className="sr-only" />
                                      </FormControl>
                                      <Label htmlFor="cash" className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'cash' && "border-primary")}>
                                          <DollarSign className="mb-3 h-6 w-6" /> Efectivo
                                      </Label>
                                  </FormItem>
                                  <FormItem className="flex-1">
                                      <FormControl>
                                        <RadioGroupItem value="card" id="card" className="sr-only" />
                                      </FormControl>
                                      <Label htmlFor="card" className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'card' && "border-primary")}>
                                          <CreditCard className="mb-3 h-6 w-6" /> Tarjeta
                                      </Label>
                                  </FormItem>
                                  <FormItem className="flex-1">
                                      <FormControl>
                                        <RadioGroupItem value="transfer" id="transfer" className="sr-only" />
                                      </FormControl>
                                      <Label htmlFor="transfer" className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'transfer' && "border-primary")}>
                                          <Landmark className="mb-3 h-6 w-6" /> Transferencia
                                      </Label>
                                  </FormItem>
                              </RadioGroup>
                          </FormItem>
                      )}
                    />

                    <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full h-12 text-md">
                        <ShoppingCart className="mr-2" />
                        Buscar Artículos
                    </Button>
                </div>
              
              <div className="mt-auto space-y-4">
                 <div className="p-4 bg-gray-100 rounded-lg">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>TOTAL A PAGAR (Bs.)</span>
                        <span>{formatCurrency(totalUSD, 'VES')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                        <span>Total en USD (Ref.)</span>
                        <span>{formatCurrency(totalUSD, 'USD')}</span>
                    </div>
                 </div>
                 <Button type="button" onClick={() => setIsPriceListOpen(true)} variant="outline" className="w-full">
                    <Info className="mr-2" />
                    Consultar Precios
                </Button>
                <Button type="submit" className="w-full text-lg h-16" disabled={cartItems.length === 0}>
                  Completar Venta
                </Button>
              </div>
            </div>

            <div className="w-1/2 flex flex-col bg-gray-50 p-6">
                <div className="mb-4">
                    <h2 className="text-2xl font-bold">RECIBO</h2>
                </div>
                <ScrollArea className="flex-1 -mx-6">
                    <div className="px-6">
                        {cartItems.length === 0 ? (
                            <div className="text-center text-gray-500 py-16">
                                <p>Aún no hay productos en el recibo.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cartItems.map(item => {
                                    const isItemWeightBased = item.unit === 'kg' || item.unit === 'litro';
                                    return (
                                        <div key={item.id} className="flex items-center bg-white p-2 rounded-lg shadow-sm">
                                            <div className="flex-1">
                                                <p className="font-bold">{item.name}</p>
                                                <p className="text-sm text-gray-500">{formatCurrency(item.price, 'VES')} por {item.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                               <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                                                    className="w-24 h-9 text-center"
                                                    min="0"
                                                    step={isItemWeightBased ? "0.01" : "1"}
                                                />
                                                <div className="w-28 text-right">
                                                    <p className="font-bold">{formatCurrency(item.price * item.quantity, 'VES')}</p>
                                                    <p className="text-xs text-gray-500">{formatCurrency(item.price * item.quantity, 'USD')}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => handleUpdateQuantity(item.id, 0)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                {cartItems.length > 0 && bcvRate && (
                    <div className="mt-4 text-right text-gray-500">
                        Tasa BCV: {bcvRate.toFixed(2)} Bs./USD
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
        bcvRate={bcvRate}
        formatCurrency={formatCurrency}
      />
      <PriceListModal
        isOpen={isPriceListOpen}
        onClose={() => setIsPriceListOpen(false)}
        products={products}
        bcvRate={bcvRate}
        formatCurrency={formatCurrency}
      />
    </Dialog>
  );
}
