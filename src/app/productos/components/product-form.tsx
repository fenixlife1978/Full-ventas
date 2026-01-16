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
import { Package, DollarSign, Hash, Tag, Save, ClipboardType, Percent, AlertTriangle, Layers } from 'lucide-react'

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
  "Alimentos Procesados", "Refrescos y Bebidas", "Alimentos enlatados",
  "Productos Lacteos", "Charcuteria", "Carniceria", "Frutas y Legumbres", "Otros",
];

export function ProductForm({ open, onOpenChange, onSubmit, product }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', description: '', category: '', price: 0, cost: 0,
      profitMargin: 0, stock: 0, minStock: 0, unit: 'unidad',
      supplier: '', status: 'active',
    },
  })

  const watchedCost = useWatch({ control: form.control, name: 'cost' });
  const watchedProfit = useWatch({ control: form.control, name: 'profitMargin' });

  useEffect(() => {
    const costValue = Number(watchedCost) || 0;
    const profitValue = Number(watchedProfit) || 0;
    const costInCents = Math.round(costValue * 100);
    const profitAmountInCents = Math.round(costInCents * (profitValue / 100));
    form.setValue('price', (costInCents + profitAmountInCents) / 100, { shouldValidate: true });
  }, [watchedCost, watchedProfit, form]);

  useEffect(() => {
    if (open) {
      form.reset(product ? {
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
      } : {
        name: '', description: '', category: '', price: 0, cost: 0,
        profitMargin: 0, stock: 0, minStock: 0, unit: 'unidad',
        supplier: '', status: 'active',
      })
    }
  }, [product, form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none max-h-[95vh] flex flex-col">
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
          
          {/* Header Compacto */}
          <DialogHeader className="bg-primary p-4 shrink-0">
            <DialogTitle className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              <Package className="w-5 h-5" />
              {product ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            {/* Contenedor con Scroll Interno */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(95vh-140px)] custom-scrollbar">
                
                {/* Información Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <InputField form={form} name="name" label="Nombre del Producto" icon={Tag} />
                  </div>
                  <div className="md:col-span-2">
                    <InputField form={form} name="description" label="Descripción (Opcional)" icon={ClipboardType} />
                  </div>
                  
                  <SelectField form={form} name="category" label="Categoría" icon={Layers} items={productCategories.map(c => ({value: c, label: c}))} />
                  <InputField form={form} name="supplier" label="Proveedor" icon={TruckIcon} />
                </div>

                {/* Precios y Costos */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-primary/5 p-3 rounded-xl border border-primary/10">
                  <InputField form={form} name="cost" label="Costo (USD)" icon={DollarSign} type="number" step="0.01" />
                  <InputField form={form} name="profitMargin" label="% Ganancia" icon={Percent} type="number" step="0.1" />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-primary uppercase ml-1">Precio Final</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-primary/60" />
                      <Input
                        readOnly
                        value={form.getValues('price')}
                        className="w-full pl-9 py-2 bg-white border-2 border-primary/20 rounded-lg font-bold text-primary text-sm h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Inventario */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputField form={form} name="stock" label="Stock" icon={Hash} type="number" />
                  <InputField form={form} name="minStock" label="Mínimo" icon={AlertTriangle} type="number" />
                  <SelectField form={form} name="unit" label="Unidad" icon={Package} items={[
                    { value: 'unidad', label: 'Unidad' }, { value: 'kg', label: 'Kg' }, { value: 'litro', label: 'Lt' }
                  ]} />
                  <SelectField form={form} name="status" label="Estado" icon={Tag} items={[
                    { value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }
                  ]} />
                </div>
              </div>

              {/* Footer Fijo */}
              <div className="p-4 bg-gray-50 border-t border-border flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="font-bold text-muted-foreground uppercase text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-xl font-black uppercase tracking-tighter italic shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-xs"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {product ? 'Actualizar' : 'Guardar Producto'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-componentes para mantener el código limpio ---

const InputField = ({ form, name, label, icon: Icon, type = "text", step }: any) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className="space-y-1.5">
        <label className="text-[10px] font-black text-primary uppercase ml-1">{label}</label>
        <div className="relative group">
          <Icon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <FormControl>
            <Input
              type={type}
              step={step}
              {...field}
              className="w-full pl-9 pr-4 py-2 bg-background border-2 border-transparent rounded-lg focus:border-primary focus:bg-white outline-none transition-all text-sm h-10 font-medium"
            />
          </FormControl>
        </div>
        <FormMessage className="text-[10px]" />
      </FormItem>
    )}
  />
);

const SelectField = ({ form, name, label, icon: Icon, items }: any) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className="space-y-1.5">
        <label className="text-[10px] font-black text-primary uppercase ml-1">{label}</label>
        <div className="relative group">
          <Icon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="w-full pl-9 py-2 bg-background border-2 border-transparent rounded-lg focus:border-primary focus:bg-white transition-all text-sm h-10 font-medium">
                <SelectValue placeholder="-" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.map((item: any) => (
                <SelectItem key={item.value} value={item.value} className="text-sm">{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormItem>
    )}
  />
);

const TruckIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10a1 1 0 0 0 1 1Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
);