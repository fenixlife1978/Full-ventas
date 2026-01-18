'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
import { type Setting } from '../configuraciones/page'

export default function ReportesPage() {
  const firestore = useFirestore()
  const [period, setPeriod] = useState('month')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  )
  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  )
  const settingsDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  )

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)
  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])
  
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

    const allItems = filteredSales.flatMap(s => s.items || [])

    // Summary
    const totalSales = filteredSales.length
    const totalRevenueCents = filteredSales.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)
    const totalRevenue = totalRevenueCents / 100
    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0)
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    // Daily Sales
    const salesByDate: { [key: string]: { date: string, ingresosCents: number, ventas: number } } = {}
    filteredSales.forEach((sale) => {
      const dateKey = format(sale.saleDate, 'yyyy-MM-dd')
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          date: format(sale.saleDate, 'dd/MM'),
          ingresosCents: 0,
          ventas: 0
        }
      }
      salesByDate[dateKey].ingresosCents += Math.round((sale.totalAmount || 0) * 100)
      salesByDate[dateKey].ventas += 1;
    })
    const dailySales = Object.values(salesByDate).map(d => ({ ...d, ingresos: d.ingresosCents / 100 })).sort((a,b) => a.date.localeCompare(b.date));


    // Top Products
    const productSales: { [key: string]: { productName: string, quantity: number, revenueCents: number, sales: number } } = {}
    allItems.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          productName: item.productName,
          quantity: 0,
          revenueCents: 0,
          sales: 0, // This is harder to track now, represents how many transactions included this product
        }
      }
      productSales[item.productId].quantity += item.quantity
      const itemRevenueCents = Math.round(item.unitPrice * item.quantity * 100)
      productSales[item.productId].revenueCents += itemRevenueCents
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(p => ({
        productName: p.productName,
        quantity: p.quantity,
        sales: p.sales,
        revenue: p.revenueCents / 100,
      }))

    // Sales by Payment
    const paymentMethods: { [key: string]: { method: string, totalCents: number, cantidad: number } } = {}
     const getPaymentMethodLabel = (method: string) => {
        const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
        // @ts-ignore
        return labels[method] || method;
    };
    filteredSales.forEach((sale) => {
      const method = sale.paymentMethod || 'other'
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          method: getPaymentMethodLabel(method),
          totalCents: 0,
          cantidad: 0
        }
      }
      paymentMethods[method].totalCents += Math.round((sale.totalAmount || 0) * 100)
      paymentMethods[method].cantidad += 1
    })
    const salesByPayment = Object.values(paymentMethods).map(p => ({ ...p, total: p.totalCents / 100 }));

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
    // @ts-ignore
    return labels[period] || period
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

  const exportToPDF = () => {
    const doc = new jsPDF()
    const periodLabel = getPeriodLabel()

    // Title
    doc.setFontSize(20)
    doc.text(`Reporte de Ventas: ${periodLabel}`, 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 28)

    // Summary Section
    const summaryData = [
      ['Total Transacciones', reportData.summary.totalSales.toString()],
      ['Ingresos Totales', bcvRate ? formatCurrency(reportData.summary.totalRevenue, 'VES') : formatCurrency(reportData.summary.totalRevenue, 'USD')],
      ['Ticket Promedio', bcvRate ? formatCurrency(reportData.summary.averageTicket, 'VES') : formatCurrency(reportData.summary.averageTicket, 'USD')],
      ['Productos Vendidos', reportData.summary.totalQuantity.toString()],
    ]

    autoTable(doc, {
      startY: 35,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [31, 122, 85] },
    })
    
    let lastTableY = (doc as any).lastAutoTable.finalY;

    // Top Products Table
    if (reportData.topProducts.length > 0) {
      autoTable(doc, {
        startY: lastTableY + 10,
        head: [['#', 'Producto', 'Cantidad', 'Ingresos']],
        body: reportData.topProducts.map((p, i) => [
          i + 1,
          p.productName,
          p.quantity,
          bcvRate ? formatCurrency(p.revenue, 'VES') : formatCurrency(p.revenue, 'USD'),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [31, 122, 85] },
      })
      lastTableY = (doc as any).lastAutoTable.finalY;
    }
    
    // Payment Methods Table
     if (reportData.salesByPayment.length > 0) {
        autoTable(doc, {
            startY: lastTableY + 10,
            head: [['Método de Pago', 'Cantidad', 'Total']],
            body: reportData.salesByPayment.map(p => [
                p.method,
                p.cantidad,
                bcvRate ? formatCurrency(p.total, 'VES') : formatCurrency(p.total, 'USD')
            ]),
            theme: 'striped',
            headStyles: { fillColor: [31, 122, 85] },
        })
    }


    doc.save(`reporte-ventas-${period}-${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingSettings
  
  const chartConfig = {
      ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
      total: { label: "Total", color: "hsl(var(--primary))" },
  } satisfies React.ComponentProps<typeof ChartContainer>["config"]

  if (isLoading || !isClient) {
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
              onClick={exportToPDF}
              className="bg-white border-2 border-primary text-primary px-6 py-3 rounded-xl font-bold uppercase tracking-tighter hover:bg-primary/5 transition-all duration-200"
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
                Total Transacciones
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
                {bcvRate ? formatCurrency(reportData.summary.totalRevenue, 'VES') : formatCurrency(reportData.summary.totalRevenue, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{bcvRate ? formatCurrency(reportData.summary.totalRevenue, 'USD') : getPeriodLabel()}</p>
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
                {bcvRate ? formatCurrency(reportData.summary.averageTicket, 'VES') : formatCurrency(reportData.summary.averageTicket, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{bcvRate ? formatCurrency(reportData.summary.averageTicket, 'USD') : 'Por transacción'}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Productos Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {reportData.summary.totalQuantity.toLocaleString('es-VE')}
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
                Ingresos por Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.dailySales.length > 0 ? (
                <div className="h-64">
                   <ChartContainer config={chartConfig} className="w-full h-full">
                        <BarChart data={reportData.dailySales} accessibilityLayer>
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `Bs.${value}`} />
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
                Ingresos por Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.salesByPayment.length > 0 ? (
                <div className="h-64">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                        <BarChart data={reportData.salesByPayment} accessibilityLayer>
                           <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={8} />
                           <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `Bs.${value}`} />
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
                        <td className="py-3 px-4 text-right">
                          <div className="font-semibold text-primary">{bcvRate ? formatCurrency(product.revenue, 'VES') : formatCurrency(product.revenue, 'USD')}</div>
                          {bcvRate && <div className="text-xs text-muted-foreground">{formatCurrency(product.revenue, 'USD')}</div>}
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
