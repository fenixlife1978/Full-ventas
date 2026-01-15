'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import * as z from 'zod'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const formSchema = z.object({
  reportTitle: z.string().min(1, 'El título es requerido.'),
  dataPoints: z
    .array(
      z.object({
        label: z.string().min(1, 'La etiqueta es requerida.'),
        value: z.string().min(1, 'El valor es requerido.'),
      })
    )
    .min(1, 'Debe agregar al menos un punto de datos.'),
  additionalContext: z.string().optional(),
})

type ReportFormValues = z.infer<typeof formSchema>

interface ReportGeneratorProps {
  onGenerate: (data: ReportFormValues) => void
  isGenerating: boolean
}

export function ReportGenerator({
  onGenerate,
  isGenerating,
}: ReportGeneratorProps) {
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportTitle: '',
      dataPoints: [{ label: '', value: '' }],
      additionalContext: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'dataPoints',
  })

  const onSubmit = (data: ReportFormValues) => {
    onGenerate(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generador de Reportes</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="reportTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Reporte</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Reporte de Ventas Q3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Puntos de Datos</FormLabel>
              <div className="mt-2 space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-2 p-3 border rounded-md"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <FormField
                        control={form.control}
                        name={`dataPoints.${index}.label`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Etiqueta</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Ingresos Totales" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`dataPoints.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Valor</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: $50,000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ label: '', value: '' })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Punto
                </Button>
                {form.formState.errors.dataPoints?.message && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.dataPoints.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="additionalContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contexto Adicional</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Proporcione cualquier contexto adicional que el generador de IA deba considerar."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Generar Reporte
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
