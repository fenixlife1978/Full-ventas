'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { BarChart3, TrendingUp } from 'lucide-react'

const chartConfig = {
  ingresos: { label: 'Ingresos', color: 'hsl(var(--primary))' },
  total: { label: 'Total', color: 'hsl(var(--primary))' },
}

export function ReportBody({ reportData, formatCurrency, bcvRate }: any) {
  return (
    <>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5" />
              Ingresos por Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.dailySales.length > 0 ? (
              <div className="h-64">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart data={reportData.dailySales} accessibilityLayer>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => bcvRate ? `Bs.${value * bcvRate}` : `$${value}`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `Fecha: ${label}`}
                          formatter={(value, name, props) => {
                            return (
                              <div className="flex flex-col gap-1 text-sm">
                                <div>
                                  <span className="font-bold">
                                    {formatCurrency(props.payload.ingresos, 'VES')}
                                  </span>
                                  {bcvRate && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({formatCurrency(props.payload.ingresos, 'USD')})
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {props.payload.ventas} ventas
                                </div>
                              </div>
                            )
                          }}
                        />
                      }
                    />
                    <Bar
                      dataKey="ingresos"
                      fill="var(--color-ingresos)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5" />
              Ingresos por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.salesByPayment.length > 0 ? (
              <div className="h-64">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart data={reportData.salesByPayment} accessibilityLayer>
                    <XAxis
                      dataKey="method"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => bcvRate ? `Bs.${value * bcvRate}` : `$${value}`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, props) => {
                            return (
                              <div className="flex flex-col gap-1 text-sm">
                                <div>
                                  <span className="font-bold">
                                    {formatCurrency(props.payload.total, 'VES')}
                                  </span>
                                  {bcvRate && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({formatCurrency(props.payload.total, 'USD')})
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {props.payload.cantidad} transacciones
                                </div>
                              </div>
                            )
                          }}
                        />
                      }
                    />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="bg-card border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">
            Productos Más Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border/50">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      #
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Producto
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topProducts.map((product, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/20 last:border-0 hover:bg-muted transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-primary">
                        {product.productName}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {product.quantity}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-primary">
                          {formatCurrency(product.revenue, 'VES')}
                        </div>
                        {bcvRate && (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(product.revenue, 'USD')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos de productos para mostrar
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
