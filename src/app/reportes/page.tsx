'use client'

import { useState, useMemo } from 'react'
import { useCollection, useFirestore } from '@/firebase'
import { collection } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { Download, BarChart3, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'
import Layout from '@/app/layout-app'
import { Skeleton } from '@/components/ui/skeleton'
import { type Sale } from '../ventas/page'
import { type Product } from '../productos/page'

export default function ReportesPage() {
  const firestore = useFirestore()
  const [period, setPeriod] = useState('month')

  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  )
  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  )

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  
  const formattedSales = useMemo(() => {
    return sales?.map(sale => ({
      ...sale,
      saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : new Date(sale.saleDate)
    })).sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime()) || []
  }, [sales])


  const reportData = useMemo(() => {
    if (!sales) {
      return {
        dailySales: [],
        topProducts: [],
        salesByPayment: [],
        summary: {
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          totalQuantity: 0,
        },
      }
    }

    let filteredSales = formattedSales
    let startDate

    if (period === 'today') {
      startDate = startOfToday()
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    } else if (period === 'week') {
      startDate = startOfWeek(new Date())
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    } else if (period === 'month') {
      startDate = startOfMonth(new Date())
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    } else if (period === 'year') {
      startDate = startOfYear(new Date())
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    }

    // Summary
    const totalSales = filteredSales.length
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantity, 0)
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    // Daily Sales
    const salesByDate: { [key: string]: { date: string, ingresos: number, ventas: number } } = {}
    filteredSales.forEach((sale) => {
      const dateKey = format(sale.saleDate, 'yyyy-MM-dd')
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          date: format(sale.saleDate, 'dd/MM'),
          ingresos: 0,
          ventas: 0
        }
      }
      salesByDate[dateKey].ingresos += sale.totalAmount
      salesByDate[dateKey].ventas += 1;
    })
    const dailySales = Object.values(salesByDate).sort((a,b) => a.date.localeCompare(b.date));


    // Top Products
    const productSales: { [key: string]: { productName: string, quantity: number, revenue: number, sales: number } } = {}
    filteredSales.forEach((sale) => {
      if (!productSales[sale.productId]) {
        productSales[sale.productId] = {
          productName: sale.productName,
          quantity: 0,
          revenue: 0,
          sales: 0,
        }
      }
      productSales[sale.productId].quantity += sale.quantity
      productSales[sale.productId].revenue += sale.totalAmount
      productSales[sale.productId].sales += 1
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Sales by Payment
    const paymentMethods: { [key: string]: { method: string, total: number, cantidad: number } } = {}
     const getPaymentMethodLabel = (method: string) => {
        const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
        return labels[method] || method;
    };
    filteredSales.forEach((sale) => {
      const method = sale.paymentMethod || 'other'
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          method: getPaymentMethodLabel(method),
          total: 0,
          cantidad: 0
        }
      }
      paymentMethods[method].total += sale.totalAmount
      paymentMethods[method].cantidad += 1
    })
    const salesByPayment = Object.values(paymentMethods);

    return {
      dailySales,
      topProducts,
      salesByPayment,
      summary: {
        totalSales,
        totalRevenue,
        averageTicket,
        totalQuantity,
      },
    }
  }, [formattedSales, period])

  const getPeriodLabel = () => {
    const labels = {
      today: 'Hoy',
      week: 'Esta Semana',
      month: 'Este Mes',
      year: 'Este Año',
      all: 'Todo el Tiempo',
    }
    return labels[period] || period
  }

  const exportToCSV = () => {
    const csvData = [
      ['Reporte de Ventas - ' + getPeriodLabel()],
      [''],
      ['Resumen'],
      ['Total Ventas', reportData.summary.totalSales],
      ['Ingresos Totales', reportData.summary.totalRevenue.toFixed(2)],
      ['Ticket Promedio', reportData.summary.averageTicket.toFixed(2)],
      ['Cantidad Total Vendida', reportData.summary.totalQuantity],
      [''],
      ['Productos Más Vendidos'],
      ['Producto', 'Cantidad', 'Ventas', 'Ingresos'],
      ...reportData.topProducts.map((p) => [
        p.productName,
        p.quantity,
        p.sales,
        p.revenue.toFixed(2),
      ]),
    ]

    const csv = csvData.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-ventas-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
     style: 'currency',
     currency: 'EUR',
   }).format(value)
 }

  const isLoading = isLoadingSales || isLoadingProducts
  
  const chartConfig = {
      ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
      total: { label: "Total", color: "hsl(var(--primary))" },
  } satisfies React.ComponentProps<typeof ChartContainer>["config"]

  if (isLoading) {
    return (
        <Layout currentPageName="Reportes">
            <div className="space-y-6 p-4 md:p-8">
                {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}
            </div>
        </Layout>
    )
  }

  return (
    <Layout currentPageName="Reportes">
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground mt-2">Análisis de ventas y productos</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px] border-border/50 focus:ring-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="year">Este Año</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {reportData.summary.totalSales}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(reportData.summary.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(reportData.summary.averageTicket)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por venta</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unidades Vendidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {reportData.summary.totalQuantity.toLocaleString('es-ES')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales Chart */}
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5" />
                Ventas por Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.dailySales.length > 0 ? (
                <div className="h-64">
                   <ChartContainer config={chartConfig} className="w-full h-full">
                        <BarChart data={reportData.dailySales} accessibilityLayer>
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value}`} />
                           <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={4} />
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
                Ventas por Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.salesByPayment.length > 0 ? (
                <div className="h-64">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                        <BarChart data={reportData.salesByPayment} accessibilityLayer>
                           <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={8} />
                           <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value}`} />
                           <ChartTooltip content={<ChartTooltipContent />} />
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
            <CardTitle className="text-foreground">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border/50">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Producto</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Cantidad</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Ventas</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topProducts.map((product, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/20 last:border-0 hover:bg-muted transition-colors"
                      >
                        <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                        <td className="py-3 px-4 font-medium text-primary">{product.productName}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground">{product.quantity}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground">{product.sales}</td>
                        <td className="py-3 px-4 text-right font-semibold text-primary">
                          {formatCurrency(product.revenue)}
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
      </div>
    </Layout>
  )
}
