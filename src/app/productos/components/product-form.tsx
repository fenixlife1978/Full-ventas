'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Product } from '../page'
import { useEffect } from 'react'
import { Package, DollarSign, Hash, Tag, Save, X, ClipboardType, Percent, AlertTriangle } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  cost: z.coerce.number().min(0, 'El costo no puede ser negativo.').optional(),
  profitMargin: z.coerce.number().optional(),
  stock: z.coerce.number().int('El stock debe ser un número entero.'),
  minStock: z.coerce.number().int('El stock mínimo debe ser un número entero.').optional(),
  unit: z.string().optional(),
  supplier: z.string().optional(),
  status: z.enum(['active', 'inactive']),
})

export type ProductFormValues = z.infer<typeof formSchema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProductFormValues) => void
  product: Product | null
}

const productCategories = [
  "Alimentos Procesados",
  "Refrescos y Bebidas",
  "Alimentos enlatados",
  "Productos Lacteos",
  "Charcuteria",
  "Carniceria",
  "Frutas y Legumbres",
  "Otros",
];

export function ProductForm({
  open,
  onOpenChange,
  onSubmit,
  product,
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      price: 0,
      cost: 0,
      profitMargin: 0,
      stock: 0,
      minStock: 0,
      unit: 'unidad',
      supplier: '',
      status: 'active',
    },
  })

  const watchedCost = useWatch({ control: form.control, name: 'cost' });
  const watchedProfit = useWatch({ control: form.control, name: 'profitMargin' });

  useEffect(() => {
    const costValue = Number(watchedCost) || 0;
    const profitValue = Number(watchedProfit) || 0;

    if (costValue >= 0) {
      const costInCents = Math.round(costValue * 100);
      const profitAmountInCents = Math.round(costInCents * (profitValue / 100));
      const newPriceInCents = costInCents + profitAmountInCents;
      const newPrice = newPriceInCents / 100;
      
      form.setValue('price', newPrice, { 
        shouldValidate: true,
        shouldDirty: true 
      });
    }
  }, [watchedCost, watchedProfit, form]);

  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          ...product,
          name: product.name || '',
          description: product.description || '',
          category: product.category || '',
          price: product.price || 0,
          cost: product.cost || 0,
          profitMargin: product.profitMargin || 0,
          stock: product.stock || 0,
          minStock: product.minStock || 0,
          unit: product.unit || 'unidad',
          supplier: product.supplier || '',
          status: product.status || 'active',
        })
      } else {
        form.reset({
          name: '',
          description: '',
          category: '',
          price: 0,
          cost: 0,
          profitMargin: 0,
          stock: 0,
          minStock: 0,
          unit: 'unidad',
          supplier: '',
          status: 'active',
        })
      }
    }
  }, [product, form, open])

  const handleFormSubmit = (values: ProductFormValues) => {
    onSubmit(values)
  }

  const InputField = ({ name, placeholder, icon: Icon, type = "text", step }: { name: keyof ProductFormValues, placeholder: string, icon: React.ElementType, type?: string, step?: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
            <label className="text-xs font-black text-primary uppercase ml-1">{placeholder}</label>
            <div className="relative group">
                <Icon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <FormControl>
                    <Input
                        type={type}
                        step={step}
                        placeholder={placeholder}
                        {...field}
                        className="w-full pl-10 pr-4 py-3 bg-background border-2 border-transparent rounded-xl focus:border-primary focus:bg-white outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground/60 h-auto"
                    />
                </FormControl>
                <FormMessage className="text-xs pt-1"/>
            </div>
        </FormItem>
      )}
    />
  );
  
  const SelectField = ({ name, placeholder, icon: Icon, items }: { name: keyof ProductFormValues, placeholder: string, icon: React.ElementType, items: {value: string, label: string}[] }) => (
     <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
            <label className="text-xs font-black text-primary uppercase ml-1">{placeholder}</label>
            <div className="relative group">
                <Icon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                 <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full pl-10 pr-4 py-3 bg-background border-2 border-transparent rounded-xl focus:border-primary focus:bg-white outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground/60 h-auto">
                        <SelectValue placeholder={placeholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map(item => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage className="text-xs pt-1"/>
            </div>
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none">
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <DialogHeader className="bg-primary p-6 text-left">
            <DialogTitle className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              <Package className="w-6 h-6" />
              {product ? 'Editar Producto' : 'Registrar Nuevo Producto'}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-xs font-medium uppercase mt-1">
              Completa los datos para actualizar tu inventario
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <InputField name="name" placeholder="Nombre del Producto" icon={Tag} />
                    </div>
                    <div className="md:col-span-2">
                       <InputField name="description" placeholder="Descripción (Opcional)" icon={ClipboardType} />
                    </div>
                    
                    <SelectField name="category" placeholder="Categoría" icon={Package} items={productCategories.map(c => ({value: c, label: c}))} />
                    <InputField name="supplier" placeholder="Proveedor (Opcional)" icon={Package} />

                    <InputField name="cost" placeholder="Costo (USD)" icon={DollarSign} type="number" step="0.01" />
                    <InputField name="profitMargin" placeholder="% Ganancia" icon={Percent} type="number" step="0.1" />

                    <div className="space-y-2">
                        <label className="text-xs font-black text-primary uppercase ml-1">Precio Final (USD)</label>
                        <div className="relative group">
                            <DollarSign className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                type="number"
                                readOnly
                                value={form.getValues('price')}
                                className="w-full pl-10 pr-4 py-3 bg-muted border-2 border-transparent rounded-xl outline-none transition-all font-bold text-primary placeholder:text-muted-foreground/60 h-auto"
                            />
                        </div>
                    </div>

                    <InputField name="stock" placeholder="Stock Inicial" icon={Hash} type="number" />
                    <InputField name="minStock" placeholder="Stock Mínimo Alerta" icon={AlertTriangle} type="number" />

                    <SelectField name="unit" placeholder="Unidad" icon={Package} items={[
                        { value: 'unidad', label: 'Unidad (ud)' },
                        { value: 'caja', label: 'Caja (cj)' },
                        { value: 'kg', label: 'Kilogramo (kg)' },
                        { value: 'litro', label: 'Litro (lt)' },
                    ]} />
                    
                    <SelectField name="status" placeholder="Estado" icon={Tag} items={[
                       { value: 'active', label: 'Activo' },
                       { value: 'inactive', label: 'Inactivo' },
                    ]} />
                </div>
                
                <div className="h-px bg-border/50 my-2" />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-secondary transition-all active:scale-95"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    type="submit"
                    className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-tighter italic shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95"
                  >
                    <Save className="w-5 h-5" />
                    {product ? 'Guardar Cambios' : 'Guardar Producto'}
                  </Button>
                </div>
            </form>
           </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
