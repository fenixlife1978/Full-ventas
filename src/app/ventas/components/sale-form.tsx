'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import * as z from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Plus, Search, Trash2, X, DollarSign, CreditCard, Landmark } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { type Product } from '@/app/productos/page'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'


const formSchema = z.object({
  saleDate: z.date({
    required_error: 'La fecha de venta es requerida.',
  }),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']),
  notes: z.string().optional(),
})

export type SaleFormValues = z.infer<typeof formSchema>

export interface CartItem extends Product {
  quantity: number
}

interface SaleFormProps {
  onSubmit: (values: SaleFormValues & { items: CartItem[], totalAmount: number, saleNumber: number }) => void
  products: Product[]
  isLoadingProducts: boolean
  bcvRate: number | null
  saleCount: number
}

export function SaleForm({
  onSubmit,
  products,
  isLoadingProducts,
  bcvRate,
  saleCount,
}: SaleFormProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const [isPriceCheckerOpen, setIsPriceCheckerOpen] = useState(false)
  const [selectedPriceCheckerProductId, setSelectedPriceCheckerProductId] = useState<string | null>(null)
  
  const { toast } = useToast()
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saleDate: new Date(),
      paymentMethod: 'cash',
      notes: '',
    },
  })

  const selectedPriceCheckerProduct = useMemo(() => {
      if (!selectedPriceCheckerProductId || !products) return null;
      return products.find(p => p.id === selectedPriceCheckerProductId) || null;
  }, [selectedPriceCheckerProductId, products]);
  
  // Reset form on successful sale (indicated by saleCount change)
  useEffect(() => {
    form.reset({
        saleDate: new Date(),
        paymentMethod: 'cash',
        notes: '',
    });
    setCartItems([]);
  }, [saleCount, form])


  useEffect(() => {
    if (cartItems.length > 0 && products.length > 0) {
      setCartItems(prevItems => 
        prevItems.map(item => {
          const freshProduct = products.find(p => p.id === item.id);
          if (freshProduct && freshProduct.price !== item.price) {
            return { ...item, price: freshProduct.price };
          }
          return item;
        })
      );
    }
  }, [products]);


  const totalUSD = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * (item.quantity || 0), 0)
  }, [cartItems])

  const totalBs = useMemo(() => {
    return totalUSD * (bcvRate || 0)
  }, [totalUSD, bcvRate])

  const handleAddProduct = (product: Product, quantity: number) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev;
      }
      return [...prev, { ...product, quantity }];
    });
    setIsProductSelectorOpen(false);
  }
  
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleFormSubmit = (values: SaleFormValues) => {
    const validItems = cartItems.filter(item => item.quantity > 0)
    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Venta Vacía',
        description: 'Debes agregar al menos un producto con cantidad mayor a 0.',
      })
      return;
    }
    onSubmit({
      ...values,
      items: validItems,
      totalAmount: totalUSD,
      saleNumber: saleCount + 1,
    })
  }

  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
      if (currency === 'VES' && bcvRate) {
        value = value * bcvRate
        return `Bs. ${new Intl.NumberFormat('es-VE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)}`
      }
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'USD',
      }).format(value)
  }

  const formatBs = (value: number) => {
    return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)}`
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-4rem)]">
        {/* Columna Izquierda */}
        <div className="p-6 flex flex-col bg-background">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl text-foreground font-bold">Nueva Venta</h2>
              <Button onClick={() => setIsPriceCheckerOpen(true)} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <DollarSign className="mr-2 h-4 w-4" />
                Consultar Precio
              </Button>
            </div>
             <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 flex-grow flex flex-col">
                <div className="space-y-4 flex-grow">
                  <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Observaciones de la venta..."
                              className="resize-none border-border/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 md:grid-cols-4 gap-2"
                          >
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="cash" className="sr-only" />
                              </FormControl>
                              <FormLabel className="w-full">
                                <Button type="button" variant={field.value === 'cash' ? 'default' : 'outline'} className="w-full">
                                  <DollarSign className="mr-2"/> Efectivo
                                </Button>
                              </FormLabel>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="card" className="sr-only" />
                              </FormControl>
                              <FormLabel className="w-full">
                                <Button type="button" variant={field.value === 'card' ? 'default' : 'outline'} className="w-full">
                                  <CreditCard className="mr-2"/> Tarjeta
                                </Button>
                              </FormLabel>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="transfer" className="sr-only" />
                              </FormControl>
                              <FormLabel className="w-full">
                                <Button type="button" variant={field.value === 'transfer' ? 'default' : 'outline'} className="w-full">
                                  <Landmark className="mr-2"/> Transf/PM
                                </Button>
                              </FormLabel>
                            </FormItem>
                             <FormItem>
                              <FormControl>
                                <RadioGroupItem value="other" className="sr-only" />
                              </FormControl>
                              <FormLabel className="w-full">
                                <Button type="button" variant={field.value === 'other' ? 'default' : 'outline'} className="w-full">
                                  Otro
                                </Button>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saleDate"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                         <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: es })
                                ) : (
                                  <span>Fecha de venta</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4 mt-auto pt-4">
                    <Button type="button" onClick={() => setIsProductSelectorOpen(true)} className="w-full bg-gray-900 text-white hover:bg-gray-700">
                        <Plus className="w-4 h-4 mr-2" /> Buscar Productos
                    </Button>
                    <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-border text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total a Pagar</p>
                        <p className="font-bold text-3xl text-primary">{formatBs(totalBs)}</p>
                        <p className="text-sm text-muted-foreground font-medium">{formatCurrency(totalUSD)} USD</p>
                    </div>
                    <Button type="submit" disabled={cartItems.length === 0} className="w-full text-lg h-12">
                        Registrar Venta
                    </Button>
                </div>
              </form>
            </Form>
        </div>

        {/* Columna Derecha (Ticket) */}
        <div className="p-6 bg-muted/40 flex flex-col border-l border-border/50">
          <div className="flex flex-col h-full">
              <div className="border-2 border-dashed border-destructive/20 p-5 rounded-md w-full bg-background mb-4 shadow-sm flex-grow">
                <h3 className="text-xl font-black text-destructive text-center mb-4 italic">Recibo de Venta</h3>
                <div className="space-y-3">
                  <div className="flex font-bold text-[10px] uppercase text-muted-foreground border-b pb-2">
                    <div className="flex-1">Producto</div>
                    <div className="w-16 text-center">Cant.</div>
                    <div className="text-right w-20">Subtotal</div>
                    <div className="w-8 ml-2" />
                  </div>
                  <ScrollArea className="h-72 pr-4">
                     {cartItems.length === 0 ? (
                       <p className="text-center text-muted-foreground pt-24 text-sm italic">Agregue artículos...</p>
                     ) : (
                       cartItems.map(item => (
                        <div key={item.id} className="flex items-center text-sm py-2 border-b border-border/10 last:border-none">
                          <div className="flex-1 pr-2">
                            <p className="font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {formatCurrency(item.price)} c/u
                            </p>
                          </div>
                          <div className="w-16 text-center font-medium">
                              {item.quantity}
                            </div>
                          <div className="text-right font-mono text-xs w-20">{formatCurrency(item.price * (item.quantity || 0))}</div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 group" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive/70 group-hover:text-destructive" />
                          </Button>
                        </div>
                        ))
                     )}
                  </ScrollArea>
                </div>
              </div>
              <div className="mt-auto flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground italic">Tasa BCV: {bcvRate ? formatBs(bcvRate) : 'N/A'}</p>
              </div>
          </div>
        </div>
      </div>
      
      <ProductSelectorModal
        open={isProductSelectorOpen}
        onOpenChange={setIsProductSelectorOpen}
        products={products}
        onAddProduct={handleAddProduct}
        cartItems={cartItems}
      />
      
       <Dialog open={isPriceCheckerOpen} onOpenChange={(isOpen) => {
          setIsPriceCheckerOpen(isOpen);
          if (!isOpen) {
            setSelectedPriceCheckerProductId(null);
          }
        }}>
            <DialogContent className="max-w-md bg-background border-border/50">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-foreground">Consultor de Precios</DialogTitle>
                    <DialogDescription>
                        Selecciona un producto para ver su precio en Bs. y USD.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    
                     <div className="grid grid-cols-1 items-center gap-4">
                        <label className="text-foreground font-semibold">Producto</label>
                        <Select 
                          value={selectedPriceCheckerProductId || ''}
                          onValueChange={(productId) => {
                            setSelectedPriceCheckerProductId(productId)
                          }}
                          disabled={isLoadingProducts}
                        >
                            <SelectTrigger className="w-full border-border/50 focus:ring-ring">
                                <SelectValue placeholder={isLoadingProducts ? "Cargando..." : "Selecciona un producto"} />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedPriceCheckerProduct && bcvRate && (
                        <Card className="col-span-3 mt-4 border-primary bg-primary/5">
                            <CardContent className="pt-6 text-center">
                                <p className="text-sm text-muted-foreground">{selectedPriceCheckerProduct.name}</p>
                                <p className="text-6xl font-bold text-primary my-2">
                                    {formatCurrency(selectedPriceCheckerProduct.price, 'VES')}
                                </p>
                                <p className="text-lg font-semibold text-muted-foreground">
                                    {formatCurrency(selectedPriceCheckerProduct.price, 'USD')}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {!bcvRate && (
                      <div className="text-center text-muted-foreground p-4 bg-muted rounded-md">
                        <p>Por favor, establece la tasa BCV en la página de <Link href="/configuraciones" className="text-primary underline">Configuraciones</Link> para ver los precios en Bolívares.</p>
                      </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </>
  )
}

interface ProductSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  cartItems: CartItem[];
  onAddProduct: (product: Product, quantity: number) => void;
}

function ProductSelectorModal({ open, onOpenChange, products, cartItems, onAddProduct }: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();

  const cartItemIds = useMemo(() => new Set(cartItems.map(item => item.id)), [cartItems]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
      p.status === 'active' && 
      p.stock > 0 &&
      !cartItemIds.has(p.id)
    )
  }, [products, searchTerm, cartItemIds])

  const handleAdd = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    if (quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Cantidad Inválida',
        description: 'La cantidad debe ser mayor que 0.'
      });
      return;
    }
    if (quantity > product.stock) {
      toast({
        variant: 'destructive',
        title: 'Stock Insuficiente',
        description: `Solo quedan ${product.stock} unidades de ${product.name}.`
      });
      return;
    }
    onAddProduct(product, quantity);
    // Reset quantity for that product to avoid confusion
    setQuantities(prev => {
      const newState = { ...prev };
      delete newState[product.id];
      return newState;
    });
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }
  
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setQuantities({})
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold">Selección de Inventario</DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {filteredProducts.map((product: Product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                <div className="flex-1">
                  <p className="font-bold text-sm uppercase">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Existencia: <span className={product.stock <= 3 ? "text-red-500 font-bold" : "font-semibold"}>{product.stock}</span> | 
                    Precio Unitario: <span className="text-primary font-bold">{formatCurrency(product.price)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number"
                    placeholder="Cant."
                    className="h-8 w-16 text-center"
                    min="1"
                    defaultValue="1"
                    onChange={(e) => setQuantities(prev => ({...prev, [product.id]: parseInt(e.target.value, 10)}))}
                  />
                  <Button size="sm" onClick={() => handleAdd(product)} className="h-8">
                    <Plus className="w-3 h-3 mr-1"/> Añadir
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-sm italic">No hay productos que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
